const writeLog = (...argList) => {
  console.log("TJFG:", ...argList);
};

writeLog("Processor script loaded.");

// ------ Shared - Start
const DEFAULT_REGEX_STRING = "^s?[a-z]{1,2}-[0-9]{1,5}[ ]*:";
const LOCALSTORAGE_KEY = "to_jira_from_gh__regex3";
// ------ Shared - End

const POLLING_DELAY = 1000;
const SECONDARY_DELAY = 1000;
const MAX_ATTEMPTS = 6;

const QUERY_STRING = "a.Link--primary";
const QUERY_STRING_2 = "a.Link--secondary";
const QUERY_STRING_3 = "div.commit-title.markdown-title";

const ANCHOR_CLASSNAME = "jira-github-bridge-ext-link";

let activeRegex = null; // Global variable

const loadRegexFromLocalStorage = (cbfn) => {
  chrome.storage.sync.get([LOCALSTORAGE_KEY], (obj) => {
    let value = obj[LOCALSTORAGE_KEY];
    let regexString = value ? value : DEFAULT_REGEX_STRING;
    activeRegex = new RegExp(regexString, "i");
    cbfn();
  });
};

const extractStoryId = (el) => {
  let text = el.innerHTML;

  let matches = String(text).match(activeRegex);
  if (!matches) return false;

  let key = matches[0];
  key = key.trim();
  key = key.slice(0, key.length - 1);

  return key;
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
    writeLog("possible storyId:", storyId);

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

loadRegexFromLocalStorage(() => {
  setTimeout(pollingAgentFn, POLLING_DELAY);
});
