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

  // Event listener for saving token
  document.getElementById("save-token").addEventListener("click", async () => {
    const tokenInput = document.getElementById("canvas-token").value;

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
          reject(chrome.runtime.lastError);
        } else if (response.error) {
          reject(new Error(response.error));
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
    const date = new Date(event.start_at);
    const formattedDate = date.toLocaleString();

    listItem.innerHTML = `<strong>${event.title}</strong><br>${formattedDate}`;
    eventList.appendChild(listItem);
  });
}
