function buildBookmarksList(bookmarks) {
  let folderAndUrls = {};

  if (!bookmarks[0]?.children) {
    console.warn("No bookmarks available in the provided structure.");
    return folderAndUrls;
  }

  const bookmarkFolders = bookmarks[0].children;
  bookmarkFolders.forEach((folder) => {
    if (folder.title === "Bookmarks Bar" && folder.children) {
      folder.children.forEach((subfolder) => {
        if (subfolder.children) {
          // It's a folder, not a URL
          folderAndUrls[subfolder.title] = subfolder.children.map(
            (url) => url.url
          );
        }
      });
    }
  });

  return folderAndUrls;
}

async function getBookmarksObj() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((bookmarks) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(bookmarks);
      }
    });
  });
}

export async function displayBookmarks() {
  const dropdownMenu = document.getElementById("dropdownMenu");

  // Clear existing options
  dropdownMenu.innerHTML = "";

  // Fetch bookmarks
  try {
    const bookmarks = await getBookmarksObj();
    const folderAndUrls = buildBookmarksList(bookmarks);
    const folderList = Object.keys(folderAndUrls);

    folderList.forEach((folderName, index) => {
      let option = document.createElement("option");
      option.value = index;
      option.appendChild(document.createTextNode(folderName));
      dropdownMenu.appendChild(option);
    });

    return folderAndUrls;
  } catch (error) {
    console.error("Error retrieving bookmarks:", error);
    dropdownMenu.innerHTML = "<option>Error loading bookmarks</option>";
  }
}

function getProuctInfo(doc, url) {
  let title = "N/A",
    price = "N/A",
    img = "N/A",
    store = "N/A";

  // Extract product name
  const title_div = doc.querySelector("h1");
  if (title_div) title = title_div.innerText.trim();
  var titleWords =
    title
      .toLowerCase()
      .match(/\b\w+\b/g)
      .filter((item) => item != "s") || [];

  // Extract price
  const price_div = doc.querySelectorAll(
    'span[class*="price"], div[class*="price"]'
  );

  if (price_div.length > 0) {
    for (let p of price_div) {
      const match = p.innerText.match(/[\$\€\£\¥\₹]\s?\d+([.,]\d{2})?/);
      if (match) {
        price = match[0].replace("\n", "").trim();
        break;
      }
    }
  }

  // Extract image URL
  const image_div = doc.querySelectorAll("img");

  if (image_div.length > 0) {
    for (let im of image_div) {
      const imgSrc = im.src || im.srcset.split(",")[0];
      if (imgSrc) {
        // Count the number of titleWords found in im.alt
        const matchCount = titleWords.reduce((count, word) => {
          return (
            count + (im.alt.toLowerCase().includes(word.toLowerCase()) ? 1 : 0)
          );
        }, 0);

        // Calculate the percentage of titleWords found in im.alt
        const matchPercentage = (matchCount / titleWords.length) * 100;

        // Check if match percentage is 50% or higher
        if (matchPercentage >= 50 || im.alt.toLowerCase().includes("product")) {
          img = imgSrc;
          break;
        }
      }
    }
  }
  //some image url starts with chrome extension path, so we need to replace this with the actual url
  if (img.startsWith("chrome-extension")) {
    try {
      img =
        url.match(/https:\/\/(.*?)\//)[0] +
        img.substring(img.match(img.split("/")[3]).index);
    } catch (error) {
      console.error("Error extracting image URL:", error);
    }
  }

  if (img == "N/A") {
    for (let im of image_div) {
      if (im.fetchPriority == "high") {
        img = im.src || im.srcset.split(",")[0];
        break;
      }
    }
  }

  // Extract store

  const storeMatch = url.match(/https?:\/\/(www\.)?([a-zA-Z0-9.-]+)\.[a-z]+/);
  store = storeMatch ? storeMatch[2] : "N/A";

  return [store, title, price, `=IMAGE("${img}")`, url];
}

function getProductInfo_using_json(doc, url) {
  const scriptlist = doc.querySelectorAll("script[type='application/ld+json']");
  let title = "N/A",
    price = "N/A",
    img = "N/A",
    store = "N/A";
  for (let s of scriptlist) {
    let jsonData;
    try {
      jsonData = JSON.parse(s.textContent.trim());
    } catch (error) {
      console.error("JSON parsing error:", error);
      continue;
    }

    if (jsonData["@graph"] && !jsonData["@type"]) {
      jsonData = jsonData["@graph"];
    }

    if (Array.isArray(jsonData)) {
      jsonData = jsonData[0];
    }

    if (jsonData["@type"] == "Product" || jsonData["@type"] == "ProductGroup") {
      // Extract product name
      title = jsonData["name"] || "N/A";

      let offers = jsonData["offers"] || {};
      if (Array.isArray(offers) && offers.length > 0) {
        offers = offers[0];
      }

      // Extract price
      if (Object.keys(offers).length === 0) {
        price = "product not available";
      } else {
        let currency = offers["priceCurrency"] || "";
        price =
          offers["price"] ||
          offers["highprice"] ||
          offers["highPrice"] ||
          "N/A";
        price = currency ? currency + " " + price : price;
      }

      // Extract image URL

      img = jsonData["image"];
      if (Array.isArray(img)) img = img[0];
      if (typeof img === "object") img = img["url"];
      if (typeof img === "string") {
        img = img.replace("__", "_");
        if (img.startsWith("//")) img = "https:" + img;
      } else {
        img = "N/A";
      }

      // Extract store

      store = jsonData["brand"] || "N/A";
      if (typeof store === "object") store = store["name"];
      if (store === "N/A") {
        const storeMatch = url.match(
          /https?:\/\/(www\.)?([a-zA-Z0-9.-]+)\.[a-z]+/
        );
        store = storeMatch ? storeMatch[2] : "N/A";
      }

      break; // Stop after finding the first valid Product
    }
  }

  return [store, title, price, `=IMAGE("${img}")`, url];
}

export async function fetchData(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    // Count the number of non N/A results from JSON-LD
    const jsonCount = jsonResult.slice(0, 4).reduce((count, value) => {
      return count + (!value.includes("N/A") ? 1 : 0);
    }, 0);

    // Check if more than 2 valid results are found from JSON-LD
    if (jsonCount >= 2) {
      return jsonResult; // Return if valid result from JSON-LD
    }

    // Fallback to HTML-based extraction if JSON-LD result is insufficient
    return getProductInfo(doc, url);
  } catch (error) {
    console.error("Error fetching data:", error);
    return ["N/A", "N/A", "N/A", "N/A", url];
  }
}
