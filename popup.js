console.log("Popup loaded");

// ------ Shared - Start
const DEFAULT_REGEX_STRING = "^s?[a-z]{1,2}-[0-9]{1,5}:";
const LOCALSTORAGE_KEY = "to_jira_from_gh__regex3";
// ------ Shared - End

const displayValue = (value) => {
  document.getElementById("regex-input").value = value;
};

const getValue = (cbfn) => {
  chrome.storage.sync.get([LOCALSTORAGE_KEY], (obj) => {
    let value = obj[LOCALSTORAGE_KEY];

    if (value) {
      return cbfn(value);
    }

    let toSet = { [LOCALSTORAGE_KEY]: DEFAULT_REGEX_STRING };
    chrome.storage.sync.set(toSet, () => {
      // make sure set-ing worked
      chrome.storage.sync.get([LOCALSTORAGE_KEY], (obj) => {
        let value = obj[LOCALSTORAGE_KEY];
        cbfn(value);
      });
    });
  });
};

getValue((value) => {
  displayValue(value);

  document.getElementById("default-regex").innerHTML = DEFAULT_REGEX_STRING;

  document.getElementById("save-button").addEventListener("click", () => {
    let value = document.getElementById("regex-input").value;
    value = String(value).trim();

    let toSet = { [LOCALSTORAGE_KEY]: value };
    chrome.storage.sync.set(toSet, () => {
      alert("Changes saved. Please reload the page.");
    });
  });
});
