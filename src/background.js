function ReloadSEQTAPages() {
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      if (tab.title.includes("SEQTA Learn")) {
        chrome.tabs.reload(tab.id);
      }
    }
  });
}

chrome.runtime.onMessage.addListener(function (request, sender) {
  if (request.type == "reloadTabs") {
    ReloadSEQTAPages();
  }
  else if (request.type == "githubTab") {
    chrome.tabs.create({ url: "github.com/OG-RandomTechChannel/BestSEQTA" });
  }
  else if (request.type == "setDefaultStorage") {
    console.log('setting default values')
    SetStorageValue(DefaultValues);
  }
  else if (request.type == "addPermissions") {
    if (typeof (chrome.declarativeContent) != 'undefined') {
      chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
      });
    }
    chrome.permissions.request({ permissions: ["declarativeContent"], origins: ["*://*/*"] }, function (granted) {
      if (granted) {
        rules = [
          {
            conditions: [
              new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { urlContains: 'site.seqta.com.au', schemes: ['https'] },
              })
            ],
            actions: [new chrome.declarativeContent.RequestContentScript({ js: ["SEQTA.js"] })]
          },
          {
            conditions: [
              new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { urlContains: 'learn.', schemes: ['https'] },
              })
            ],
            actions: [new chrome.declarativeContent.RequestContentScript({ js: ["SEQTA.js"] })]
          },

        ]
        for (let i = 0; i < rules.length; i++) {
          chrome.declarativeContent.onPageChanged.addRules([rules[i]]);
        }
        alert("Permissions granted. Reload SEQTA pages to see changes. If this workaround doesn't work, please contact the developer. It will be an easy fix");

      }
    });
  }


});

var NewsJSON = {};



chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.type === "sendNews") {

      // Gets the current date
      const date = new Date();
      // Formats the current date used send a request for timetable and notices later
      var TodayFormatted =
        date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

      var from = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate() - 1);
      console.log(TodayFormatted)
      console.log(from)

      // var url = `https://newsapi.org/v2/everything?sources=abc-news&from=${TodayFormatted}&sortBy=popularity&apiKey=17c0da766ba347c89d094449504e3080`;
      var url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`

      function GetNews() {
        fetch(url)
          .then((result) => result.json())
          .then((response) => {
            if (response.code == 'rateLimited') {
              url += '%00';
              GetNews();
            }
            else {
              sendResponse({ news: response })
            }
          })
      }

      GetNews();



      return true;
    }
  }
);

const DefaultValues = {
  onoff: true,
  animatedbk: true,
  lessonalert: true,
  notificationcollector: true,
  defaultmenuorder: [],
  menuitems: {},
  menuorder: [],
  subjectfilters: {},
  selectedColor: '#1a1a1a',
  DarkMode: true,
  shortcuts: [
    {
      name: "YouTube",
      enabled: false
    },
    {
      name: "Outlook",
      enabled: true
    },
    {
      name: "Office",
      enabled: true
    },
    {
      name: "Spotify",
      enabled: false
    },
    {
      name: "Google",
      enabled: true
    },
    {
      name: "DuckDuckGo",
      enabled: false
    },
    {
      name: "Cool Math Games",
      enabled: false
    },
    {
      name: "SACE",
      enabled: false
    },
    {
      name: "Google Scholar",
      enabled: false
    },
    {
      name: "Gmail",
      enabled: false
    },
    {
      name: "Netflix",
      enabled: false
    },
    {
      Name: "educationperfect",
      enabled: false
    }
  ],
  customshortcuts: []
}

function SetStorageValue(object) {
  for (var i in object) {
    chrome.storage.local.set({ [i]: object[i] })
  }

}

function UpdateCurrentValues(details) {
  console.log(details)

  chrome.storage.local.get(null, function (items) {
    var CurrentValues = items;

    const NewValue = Object.assign({}, DefaultValues, CurrentValues)

    function CheckInnerElement(element) {
      for (let i in element) {
        if (typeof element[i] === 'object') {
          if (typeof DefaultValues[i].length == 'undefined') {
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i])
          }
          else { // If the object is an array, turn it back after
            length = DefaultValues[i].length;
            NewValue[i] = Object.assign({}, DefaultValues[i], CurrentValues[i])
            NewArray = [];
            for (let j = 0; j < length; j++) {
              NewArray.push(NewValue[i][j]);

            }
            NewValue[i] = NewArray;

          }

        }
      }
    }
    CheckInnerElement(DefaultValues);

    if (items["customshortcuts"]) {
      NewValue["customshortcuts"] = items["customshortcuts"];
    }

    SetStorageValue(NewValue);
  })
}

chrome.runtime.onInstalled.addListener(function (event) {
  chrome.storage.local.remove(["justupdated"]);
  UpdateCurrentValues();
  if (/*chrome.runtime.getManifest().version > event.previousVersion || */ event.reason == 'install') {
    chrome.storage.local.set({ justupdated: true });
  }
});


