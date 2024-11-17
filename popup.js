import { displayBookmarks, fetchData } from "./bookmarks.js";

document.addEventListener("DOMContentLoaded", async function () {
  const dropdownMenu = document.getElementById("dropdownMenu");
  let parseBtn = document.getElementById("parseBtn");
  const createBookmarkBtn = document.getElementById("createBookmarkBtn");
  const sheetTitleorIDtoCheck = document.getElementById(
    "sheetTitleorIDtoCheck"
  );
  const checkSheetBtn = document.getElementById("checkSheetBtn");
  const createSheetBtn = document.getElementById("createSheetBtn");
  const selectSheetBtn = document.getElementById("selectSheetBtn");
  const checkSheetstatus = document.getElementById("checkSheetstatus");
  const selectSheetstatus = document.getElementById("selectSheetstatus");

  //sheetTitleorIDtoCheck.value = "want_to_buy";

  let sheetID; // Declare this in the global scope to use across functions
  let sheetTitle;

  // Event listener for checking if a Google Sheet exists
  checkSheetBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      {
        action: "checkSheet",
        sheetTitleorIDtoCheck: sheetTitleorIDtoCheck.value,
      },
      (response) => {
        if (response.error) {
          console.error("Error:", response.error);
          checkSheetstatus.innerText =
            response.error === "No matching Google Sheet found by title."
              ? `Sheet not found. Create a new sheet titled "${sheetTitleorIDtoCheck.value}"?`
              : response.error;
          if (response.error === "No matching Google Sheet found by title.") {
            createSheetBtn.style.display = "block";
            createSheetBtn.addEventListener("click", () => {
              chrome.runtime.sendMessage(
                {
                  action: "createSheet",
                  sheetTitle: sheetTitleorIDtoCheck.value,
                },
                (response) => {
                  if (response.error) {
                    console.error("Error:", response.error);
                  } else {
                    console.log("Sheet created:", response.data);
                    checkSheetstatus.innerText = "Sheet created!";
                    createSheetBtn.style.display = "none";
                  }
                }
              );
            });
          }
        } else {
          console.log("Sheet found:", response.data);
          checkSheetstatus.innerText = "Sheet found! Select it?";
          selectSheetBtn.style.display = "block";
          selectSheetBtn.addEventListener("click", () => {
            sheetID = response.data.id;
            sheetTitle = response.data.name;
            selectSheetstatus.innerText =
              "Sheet selected! " + sheetTitle + " " + sheetID;
          });
        }
      }
    );
  });

  // Hide create button on user input
  sheetTitleorIDtoCheck.addEventListener("input", () => {
    createSheetBtn.style.display = "none"; // Hide the button when typing
    selectSheetBtn.style.display = "none"; // Hide the button when typing
    checkSheetstatus.innerText = "";
    selectSheetstatus.innerText = "";
  });

  // Fetch and display bookmarks in dropdown
  const folderandurls = await displayBookmarks();
  const folderlist = Object.keys(folderandurls);

  dropdownMenu.addEventListener("change", () => {
    const selectedOption = document.getElementById("selectedOption");
    selectedOption.value = folderlist[dropdownMenu.value];
    selectedOption.textContent = `You selected: ${selectedOption.value}`;

    // Display the number of URLs in the selected folder
    const folderUrls = folderandurls[folderlist[dropdownMenu.value]];
    const numUrlsText = document.getElementById("numUrls");
    numUrlsText.textContent = `There are ${folderUrls.length} URLs in the selected folder.`;

    // Clear any existing event listeners on parseBtn
    const newParseBtn = parseBtn.cloneNode(true);
    parseBtn.replaceWith(newParseBtn); // Replace old button with new one
    parseBtn = newParseBtn;

    parseBtn.addEventListener("click", async () => {
      document.getElementById("parseStatus").innerText = "Processing...";
      const allCells = await Promise.all(
        folderUrls.map((url) => fetchData(url))
      );

      chrome.runtime.sendMessage(
        { action: "sendData", sheetID: sheetID, cells: allCells },
        (response) => {
          if (response.error) {
            console.error("Error:", response.error);
          } else {
            console.log("Data sent to Google Sheets:", response.data);
            document.getElementById("parseStatus").innerText =
              "Data sent to Google Sheets!";
          }
        }
      );
    });
  });

  createBookmarkBtn.addEventListener("click", () => {
    const col = document.getElementById("sheetColumn").value;
    document.getElementById("createBookmarksStatus").innerText =
      "Processing...";
    chrome.runtime.sendMessage(
      {
        action: "makeBookmarks",
        col: col,
        sheetTitle: sheetTitle,
        sheetID: sheetID,
      },
      (response) => {
        if (response.error) {
          console.error("Error:", response.error);
          document.getElementById("createBookmarksStatus").innerText =
            response.error;
        } else {
          console.log("bookmarks created!", response.data);
          document.getElementById("createBookmarksStatus").innerText =
            "Bookmarks created!";
        }
      }
    );
  });
});
