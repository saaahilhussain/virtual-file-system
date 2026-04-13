# The `item` Object Structure

The `item` object represents a single row of data from the backend. It starts in **`DirectoryView.jsx`**, where the `combinedItems` array merges your directories and files. 

It is then passed down the component tree:
`DirectoryView.jsx` -> `DirectoryList.jsx` -> `DirectoryItem.jsx` -> `ContextMenu.jsx`

## Data Structure

Because it is a raw MongoDB document fetched from your `files` or `directories` collections, it contains the following key-value pairs based on the Mongoose models:

```javascript
{
  _id: "69dcc7be60a265a496d16f50", // MongoDB exact ID
  name: "My Awesome File.pdf",    // Filename or Folder name
  size: 2450000,                  // Number of bytes (missing if it's a directory)
  extension: "pdf",               // Missing if it's a directory
  userId: "user_object_id",       // Who owns this
  parentDirId: "parent_object_id",// What folder it sits in
  createdAt: "2026-04-13T10:20:00.000Z", // Raw ISO string date
  updatedAt: "2026-04-13T10:20:00.000Z", // Raw ISO string date
  isTrashed: false,
  trashedAt: null,
  
  // React-specific keys attached dynamically in the frontend:
  isDirectory: false,             // Attached when combinedItems merged them
  isUploading: false              // Used for frontend queue logic
}
```

Whenever you interact with a file on the frontend (like clicking on it to open the Context Menu), you have access to exactly this data.
