console.log("I am in popup")
const msalConfig = {
  auth: {
    clientId: "44967bf4-a11a-493a-a4b3-ef434eb2950b", // Replace with your Azure AD app's client ID
    authority: "https://login.microsoftonline.com/common", // or your tenant ID if you're using a specific tenant
    redirectUri: `https://${chrome.runtime.id}.chromiumapp.org/` // Use this redirect URI in your Azure AD app registration 
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        console.log(`[MSAL] ${level}: ${message}`);
      },
      piiLoggingEnabled: false // Set to true if you want to log personal information (not recommended in production)
    }
  },
  cache: {
    cacheLocation: "localStorage", 
    storeAuthStateInCookie: false 
  }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);


async function signIn() {
  console.log("in sign in")
  try {
    const loginRequest = {
      scopes: ["Calendars.ReadWrite"] // Specify required permissions
    };
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    console.log("Logged in successfully:", loginResponse);
    return loginResponse.accessToken; // Get the access token
  } catch (error) {
    console.error("Error during sign-in:", error);
    return null;
  }
}

async function acquireTokenSilent() {
  console.log("in acquiare token")
  return signIn()
  try {
    const account = msalInstance.getAllAccounts()[0]; // Assuming one account for simplicity
    console.log("account ", account)
    if (!account) {
      throw msal.InteractionRequiredAuthError
    }
    const silentRequest = {
      scopes: ["Calendars.ReadWrite"],
      account: account
    };
    const tokenResponse = await msalInstance.acquireTokenSilent(silentRequest);
    return tokenResponse.accessToken;
  } catch (error) {
    console.error("Silent token acquisition failed:", error);
    if (error instanceof msal.InteractionRequiredAuthError) {
      // Attempt interactive token acquisition if silent fails
      return signIn();
    }
    return null;
  }
}

async function createOutlookEvent(accessToken, eventData) {
  const apiUrl = 'https://graph.microsoft.com/v1.0/me/events';
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: eventData.title,
      start: {
        dateTime: eventData.start_at,
        timeZone: 'UTC' // Specify your timezone
      },
      end: {
        dateTime: eventData.end_at,
        timeZone: 'UTC'
      },
      location: {
        displayName: eventData.location
      }
      // Add more fields as needed
    })
  });
  const createdEvent = await response.json();
  return createdEvent;
}
document.addEventListener("DOMContentLoaded", async () => {
  const tokenForm = document.getElementById("token-form");
  const mainContent = document.getElementById("main-content");

  // Check if token is stored
  const { canvasToken } = await chrome.storage.local.get("canvasToken");

  if (canvasToken) {
    // Token exists, hide token form and show main content
    tokenForm.style.display = "none";
    mainContent.style.display = "flex";
  } else {
    tokenForm.style.display = "flex";
    mainContent.style.display = "none";
  }

  document.getElementById("save-token").addEventListener("click", async () => {
    const tokenInput = "10~H9HX47nfATD7yVfaXPGMrPz2HUG74MkKDMXW8DvF7wWQAt6fRAx6xfkLBB9UkRPV"

    if (tokenInput) {
      // Save token in chrome.storage
      await chrome.storage.local.set({ canvasToken: tokenInput });
      alert("Token saved successfully!");

      // Hide token form and show main content
      tokenForm.style.display = "none";
      mainContent.style.display = "flex";
    } else {
      alert("Please enter a valid token.");
    }
  });

  document
    .getElementById("download-ics")
    .addEventListener("click", async () => {
      console.log("downloading and syncing")
      try {
        const events = await fetchCanvasEventsFromToday();
        if (events && events.length > 0) {
          const icsContent = generateICSContent(events);
          // downloadICSFile(icsContent);
          try {
            accessToken = await acquireTokenSilent(msalInstance)
            console.log(accessToken)
          }catch(error) {
            console.log("Error generating access token for Azure graph")
          }
          
          createOutlookEvent(accessToken, events[0])
        } else {
          alert("No events found to generate .ics.");
        }
      } catch (error) {
        console.error("Error generating .ics file:", error);
        alert(`Error generating .ics file: ${error.message}`);
      }
    });

  document
    .getElementById("fetch-events")
    .addEventListener("click", async () => {
      try {
        const events = await fetchCanvasEventsFromToday();
        if (events && events.length > 0) {
          displayEvents(events);
        } else {
          document.getElementById("event-list").innerHTML =
            "<li>No events found</li>";
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        alert(`Error fetching events: ${error.message}`);
      }
    });
});

async function fetchCanvasEventsFromToday() {
  const today = new Date().toISOString().split("T")[0];
  const { canvasToken } = await chrome.storage.local.get("canvasToken");

  if (!canvasToken) {
    throw new Error("Canvas token is missing. Please set it in the extension.");
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "fetchCanvasEvents",
        canvasToken,
        startDate: today,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else if (response.error) {
          console.error("Response error:", response.error);
          reject(new Error(response.error));
        } else {
          console.log("Received response:", response);
          resolve(response.events);
        }
      }
    );
  });
}

function displayEvents(events) {
  console.log(events)
  const eventList = document.getElementById("event-list");
  eventList.innerHTML = "";
  events.forEach((event) => {
    const date = new Date(event.start_at);
    const formattedDate = date.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const listItem = document.createElement("li");
    listItem.innerHTML = `<strong>${event.title}</strong><br>${formattedDate}`;
    eventList.appendChild(listItem);
  });
}

function generateICSContent(events) {
  const icsLines = ["BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN"];

  events.forEach((event) => {
    const start =
      new Date(event.start_at)
        .toISOString()
        .replace(/[-:]/g, "")
        .split(".")[0] + "Z";
    const end =
      new Date(event.end_at).toISOString().replace(/[-:]/g, "").split(".")[0] +
      "Z";

    // Remove HTML tags
    const cleanDescription = event.description
      ? event.description.replace(/<\/?[^>]+(>|$)/g, "")
      : "No description";

    icsLines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@canvas`,
      `SUMMARY:${event.title} Due`,
      `DESCRIPTION:${cleanDescription}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      "STATUS:CONFIRMED",
      `LOCATION:${event.location_name || "No location"}`,
      "END:VEVENT"
    );
  });

  icsLines.push("END:VCALENDAR");
  return icsLines.join("\r\n");
}

function downloadICSFile(icsContent) {
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "canvas_events.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
