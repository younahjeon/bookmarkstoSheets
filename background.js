function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  chrome.identity.getAuthToken({ interactive: true }, async (token) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
      return;
    }
    console.log("Token:", token);

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    if (request.action === "sendData") {
      const sheetName = "Sheet1";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${request.sheetID}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`;

      const fetchOptions = {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ values: request.cells }),
      };

      try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        sendResponse({ data });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    } else if (request.action === "readData") {
      const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${request.sheetId}/values/Sheet1!A1:Z1000`; // Modify range as needed

      try {
        const response = await fetch(sheetUrl, { method: "GET", headers });
        const data = await response.json();
        sendResponse({ data });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    } else if (request.action == "createSheet") {
      const url = "https://sheets.googleapis.com/v4/spreadsheets";

      const fetchOptions = {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ properties: { title: request.sheetTitle } }),
      };

      try {
        const response = await fetch(url, fetchOptions);
        const data = await response.json();
        sendResponse({ data });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    } else if (request.action === "checkSheet") {
      const sheetTitleOrID = request.sheetTitleorIDtoCheck;

      try {
        // First, check if sheetTitleOrID is a valid ID
        let url = `https://www.googleapis.com/drive/v3/files/${sheetTitleOrID}`;

        let response = await fetch(url, { method: "GET", headers });

        if (response.ok) {
          const data = await response.json();
          sendResponse({ data });
        } else {
          // If ID check fails, search by title
          url = `https://www.googleapis.com/drive/v3/files?q=name='${sheetTitleOrID}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`;

          response = await fetch(url, { method: "GET", headers });
          if (response.ok) {
            const searchData = await response.json();
            if (searchData.files && searchData.files.length > 0) {
              sendResponse({ data: searchData.files[0] }); // Return the first matching file
            } else {
              sendResponse({
                error: "No matching Google Sheet found by title.",
              });
            }
          } else {
            sendResponse({
              error: `Failed to fetch with error: ${response.statusText}`,
            });
          }
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    } else if (request.action == "makeBookmarks") {
      // create bookmark folder with the urls in google sheet
      // as a default create a folder with the
      const sheetName = "Sheet1";
      const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${request.sheetID}/values/${sheetName}!${request.col}:${request.col}`; // Modify range as needed

      try {
        const response = await fetch(sheetUrl, { method: "GET", headers });

        if (!response.ok) {
          sendResponse({ error: "Check column" });
        } else {
          const data = await response.json();

          const urls = data.values.flat();
          if (urls.length === 0) {
            sendResponse({ error: "No URLs found in the specified column." });
          } else {
            chrome.bookmarks.create(
              { title: request.sheetTitle },
              (newFolder) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error creating bookmarks folder:",
                    chrome.runtime.lastError.message
                  );
                  sendResponse({ error: "Failed to create bookmarks folder." });
                  return;
                }
                console.log("Bookmarks folder created:", newFolder);

                // Add each URL as a bookmark in the newly created folder
                urls.forEach((url) => {
                  if (isValidUrl(url)) {
                    chrome.bookmarks.create(
                      {
                        title: url,
                        url: url,
                        parentId: newFolder.id, // Place the bookmark in the new folder
                      },
                      (bookmark) => {
                        if (chrome.runtime.lastError) {
                          console.warn(
                            `Error creating bookmark for URL ${url}:`,
                            chrome.runtime.lastError.message
                          );
                        } else {
                          console.log("Bookmark added:", bookmark);
                        }
                      }
                    );
                  } else {
                    console.warn(`Skipping invalid URL: ${url}`);
                  }
                });
              }
            );
            sendResponse({ data });
          }
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    }
  });

  return true; // Keep the message channel open for async response
});
