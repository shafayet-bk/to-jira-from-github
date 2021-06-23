const writeLog = (...argList) => {
  console.log(...argList);
};

writeLog("Processor script loaded.");

const POLLING_DELAY = 1000;
const SECONDARY_DELAY = 1000;
const MAX_ATTEMPTS = 6;

const QUERY_STRING = "a.Link--primary";
const QUERY_STRING_2 = "a.Link--secondary";
const QUERY_STRING_3 = "div.commit-title.markdown-title";

const ANCHOR_CLASSNAME = "jira-github-bridge-ext-link";

const extractStoryId = (el) => {
  let text = el.innerHTML;
  let index = text.indexOf("ID-");
  if (index == -1) return false;
  let index2 = text.indexOf(":", index);
  if (index2 == -1) return false;
  return text.slice(index, index2);
};

const makeJiraLinkUrl = (storyId) => {
  return `https://bkash-tech.atlassian.net/browse/${storyId}`;
};

const makeAnchor = (storyId) => {
  let href = makeJiraLinkUrl(storyId);

  let newEl = document.createElement("a");
  newEl.classList.add(ANCHOR_CLASSNAME);
  newEl.innerHTML = "[Jira link]";
  newEl.href = href;
  newEl.style = "color:rgb(3, 102, 214);";
  newEl.target = "_blank";

  return newEl;
};

const appendAnchor = (el, anchor) => {
  if (el.nodeName === "A") {
    el.parentNode.appendChild(anchor);
  } else if (el.nodeName === "DIV") {
    el.appendChild(anchor);
  }
};

let attemptCount = 0;
const createJiraLinks = (cbfn) => {
  attemptCount += 1;

  let elList = [].concat(
    Array.from(document.querySelectorAll(QUERY_STRING)),
    Array.from(document.querySelectorAll(QUERY_STRING_2)),
    Array.from(document.querySelectorAll(QUERY_STRING_3))
  );
  elList = [...new Set(elList)];
  writeLog({ elList });

  // retry if initial attempt failed.
  if (elList.length == 0) {
    writeLog("Attempt failed");

    if (attemptCount >= MAX_ATTEMPTS) {
      writeLog("All attempts failed. Stopping.");
      cbfn();
      return;
    }

    setTimeout(() => {
      createJiraLinks(cbfn);
    }, SECONDARY_DELAY);
    return;
  }

  for (let el of elList) {
    let storyId = extractStoryId(el);
    if (!storyId) continue;

    let elExisting = el.parentNode.querySelector(`.${ANCHOR_CLASSNAME}`);
    if (!elExisting) {
      let anchor = makeAnchor(storyId);
      appendAnchor(el, anchor);
    }
  }

  cbfn();
};

let queue = [];
let isProcessing = false;
let seed = 0;

const enqueue = () => {
  writeLog("New task added");
  queue.push(seed++);
  process();
};

const process = () => {
  if (isProcessing) return;
  if (queue.length > 0) {
    let id = queue.shift();
    isProcessing = true;
    setTimeout(() => {
      writeLog(`Processing # ${id}`);
      createJiraLinks(() => {
        writeLog(`Finished # ${id}`);
        isProcessing = false;
        process();
      });
    }, SECONDARY_DELAY);
  }
};

let lastHref = null;
const pollingAgentFn = () => {
  writeLog("Polling agent");
  let nowHref = window.location.href;
  if (nowHref !== lastHref) {
    writeLog("Change detected");
    lastHref = nowHref;
    enqueue();
  }
  setTimeout(pollingAgentFn, POLLING_DELAY);
};
setTimeout(pollingAgentFn, POLLING_DELAY);
