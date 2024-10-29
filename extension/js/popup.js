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

  // Event listener to save the token when the user clicks "Save Token"
  document.getElementById("save-token").addEventListener("click", async () => {
    const tokenInput = document.getElementById("canvas-token").value;

    if (tokenInput) {
      // Save token in chrome.storage
      await chrome.storage.local.set({ canvasToken: tokenInput });
      alert("Token saved successfully!");

      // Hide token form and show main content
      tokenForm.style.display = "none";
      mainContent.style.display = "block";
    } else {
      alert("Please enter a valid token.");
    }
  });

  document
    .getElementById("fetch-events")
    .addEventListener("click", async () => {
      const events = await fetchCanvasEventsFromToday();
      if (events) {
        displayEvents(events);
      }
    });
});

async function fetchCanvasEventsFromToday() {
  const today = new Date().toISOString().split("T")[0];

  // Retrieve Canvas token from storage
  const { canvasToken } = await chrome.storage.local.get("canvasToken");

  if (!canvasToken) {
    console.error("Canvas token is missing. Please set it in the extension.");
    alert("Canvas token is missing. Please set it in the extension.");
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "fetchCanvasEvents",
        canvasToken,
        startDate: today,
      },
      (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.events);
        }
      }
    );
  });
}

function displayEvents(events) {
  const eventList = document.getElementById("event-list");
  eventList.innerHTML = "";
  events.forEach((event) => {
    const listItem = document.createElement("li");
    listItem.textContent = `${event.title} - ${event.start_at}`;
    eventList.appendChild(listItem);
  });
}
