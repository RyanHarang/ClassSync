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
    .getElementById("download-ics")
    .addEventListener("click", async () => {
      try {
        const events = await fetchCanvasEventsFromToday();
        if (events && events.length > 0) {
          const icsContent = generateICSContent(events);
          downloadICSFile(icsContent);
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
