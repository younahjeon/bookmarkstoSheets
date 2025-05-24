# Chrome Extension: Product and Bookmark Manager

This Chrome extension provides two main functions:

### 1. Create a Google Sheet with Product Information from Bookmarks

Generates a Google Sheet listing essential product information (such as product title, price, store, image, and URL) based on URLs within a specified Chrome bookmark folder.

### 2. Create a Chrome Bookmark Folder from Google Sheet URLs

Creates a new Chrome bookmark folder from a list of URLs in a specified column of a Google Sheet.



## Notes

- This extension relies on specific HTML structures to parse product information, so it may not work perfectly with all websites.
- Limitations may occur on websites that:
  - Use unique or varying HTML elements for product listings.
  - Forbid JavaScript access.
  - Dynamically load content (meaning the full HTML is only accessible once the page fully loads).
 
## Screenshot of the extension

![screenshot of the extension](https://github.com/younahjeon/bookmarkstoSheets/blob/main/bookmarktoSheet_screenshot.png)

## Screenshot of an example Google sheet created

![screenshot of the example googlesheet](https://github.com/younahjeon/bookmarkstoSheets/blob/main/bookmarktoSheet_screenshot2.png)
