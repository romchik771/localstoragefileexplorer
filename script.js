document.addEventListener('DOMContentLoaded', onLoad);

let currentPath = '';

function addRow(name, size, size_string, date_modified_string, isFolder = false) {
    if (name === "." || name === "..") return;

    const tbody = document.getElementById("tbody");
    const row = document.createElement("tr");
    const file_cell = document.createElement("td");
    const link = document.createElement("a");

    link.className = isFolder ? "icon dir" : "icon file";
    link.draggable = true;
    link.addEventListener("dragstart", onDragStart, false);
    link.addEventListener("click", () => isFolder ? navigateToFolder(name) : viewItem(name));

    link.innerText = name;
    link.href = "#"; // No actual URL for localStorage items

    file_cell.dataset.value = name;
    file_cell.appendChild(link);
    row.appendChild(file_cell);
    row.appendChild(createCell(size, size_string));
    row.appendChild(createCell(date_modified_string, date_modified_string)); // Using current time as date modified

    const action_cell = document.createElement("td");
    const delete_button = document.createElement("button");
    delete_button.innerText = "Delete";
    delete_button.addEventListener("click", () => deleteItem(name));
    action_cell.appendChild(delete_button);

    const rename_button = document.createElement("button");
    rename_button.innerText = "Rename";
    rename_button.addEventListener("click", () => renameItem(name));
    action_cell.appendChild(rename_button);

    row.appendChild(action_cell);

    tbody.appendChild(row);
}

function onDragStart(e) {
    const el = e.target;
    const name = el.innerText;
    const fullPath = currentPath + name;
    console.log("Drag started for:", fullPath); // Debugging line
    e.dataTransfer.setData("text/plain", fullPath);
    e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function onDrop(e) {
    e.preventDefault();
    const sourcePath = e.dataTransfer.getData("text/plain");
    const targetPath = currentPath; // Drop in the current folder

    console.log("Source path:", sourcePath); // Debugging line
    console.log("Target path:", targetPath); // Debugging line

    if (!sourcePath) {
        alert("Source path is empty. Drag and drop operation failed.");
        return;
    }

    const itemName = sourcePath.split('/').pop();
    const newPath = currentPath + itemName;

    console.log("Dropping item:", sourcePath, "to", newPath); // Debugging line

    moveItem(sourcePath, newPath);
    loadItemsFromLocalStorage();
}

function moveItem(sourcePath, targetPath) {
    if (localStorage.getItem(sourcePath + ".folder") !== null) {
        moveFolder(sourcePath + ".folder", targetPath + ".folder/");
    } else {
        const value = localStorage.getItem(sourcePath);
        if (value !== null) {
            console.log("Moving item from", sourcePath, "to", targetPath); // Debugging line
            localStorage.setItem(targetPath, value);
            localStorage.removeItem(sourcePath);
        } else {
            alert("File not found or cannot be moved.");
        }
    }
}

function moveFolder(sourceFolderPath, targetFolderPath) {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(sourceFolderPath)) {
            const value = localStorage.getItem(key);
            const newKey = key.replace(sourceFolderPath, targetFolderPath);
            localStorage.setItem(newKey, value);
            localStorage.removeItem(key);
        }
    }
}

function createCell(value, text) {
    const cell = document.createElement("td");
    cell.className = "detailsColumn";
    cell.dataset.value = value;
    cell.innerText = text;
    return cell;
}

function sortTable(column) {
    const theader = document.getElementById("theader");
    const oldOrder = parseInt(theader.cells[column].dataset.order || '1', 10);
    const newOrder = -oldOrder;
    theader.cells[column].dataset.order = newOrder;

    const tbody = document.getElementById("tbody");
    const rows = Array.from(tbody.rows);

    rows.sort((row1, row2) => {
        let a = row1.cells[column].dataset.value;
        let b = row2.cells[column].dataset.value;

        if (column === 1 || column === 2) {
            a = parseInt(a, 10);
            b = parseInt(b, 10);
        }

        return (a > b ? newOrder : a < b ? oldOrder : 0);
    });

    rows.forEach(row => tbody.appendChild(row));
}

function addHandlers(element, column) {
    element.onclick = () => sortTable(column);
    element.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            sortTable(column);
            e.preventDefault();
        }
    };
}

function onLoad() {
    addHandlers(document.getElementById('nameColumnHeader'), 0);
    addHandlers(document.getElementById('sizeColumnHeader'), 1);
    addHandlers(document.getElementById('dateColumnHeader'), 2);

    // Populate table with localStorage items
    loadItemsFromLocalStorage();

    // Add event listeners for creating new files and folders
    document.getElementById("create-file-button").addEventListener("click", createNewFile);
    document.getElementById("create-folder-button").addEventListener("click", createNewFolder);

    // Add drag and drop listeners to the table body
    const tbody = document.getElementById("tbody");
    tbody.addEventListener('dragover', onDragOver);
    tbody.addEventListener('drop', onDrop);
}

function loadItemsFromLocalStorage() {
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = ''; // Clear existing rows

    // Add a Back button if not in the root directory
    if (currentPath !== '') {
        const backRow = document.createElement("tr");
        const backCell = document.createElement("td");
        const backLink = document.createElement("a");

        backLink.className = "icon up";
        backLink.innerText = "[parent directory]";
        backLink.href = "#";
        backLink.addEventListener("click", () => navigateBack());

        backCell.appendChild(backLink);
        backRow.appendChild(backCell);
        tbody.appendChild(backRow);
    }

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(currentPath)) {
            const relativeKey = key.replace(currentPath, '');
            if (!relativeKey.includes('/')) { // Only show items in the current directory
                const value = localStorage.getItem(key);
                const size = new Blob([value]).size;
                const sizeString = `${size} B`;
                const dateModifiedString = new Date().toLocaleString(); // Current date/time as placeholder

                if (key.endsWith('.folder')) {
                    const { totalSize, latestModified } = getFolderDetails(currentPath + relativeKey + '.folder/');
                    addRow(relativeKey, totalSize, `${totalSize} B`, new Date(latestModified).toLocaleString(), true);
                } else {
                    addRow(relativeKey, size, sizeString, dateModifiedString, false);
                }
            }
        }
    }
}

function getFolderDetails(path) {
    let totalSize = 0;
    let latestModified = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(path)) {
            const value = localStorage.getItem(key);
            const size = new Blob([value]).size;
            const modifiedDate = Date.now(); // Placeholder for modification date

            totalSize += size;
            if (modifiedDate > latestModified) {
                latestModified = modifiedDate;
            }

            if (key.endsWith('.folder')) {
                const subFolderDetails = getFolderDetails(key + '/');
                totalSize += subFolderDetails.totalSize;
                if (subFolderDetails.latestModified > latestModified) {
                    latestModified = subFolderDetails.latestModified;
                }
            }
        }
    }
    return { totalSize, latestModified };
}

function createNewFile() {
    const newFileName = document.getElementById("new-file-name").value.trim();
    if (newFileName === "") {
        alert("File name cannot be empty.");
        return;
    }

    const fullPath = currentPath + newFileName;
    if (localStorage.getItem(fullPath) !== null) {
        alert("A file with this name already exists.");
        return;
    }

    localStorage.setItem(fullPath, ""); // Create an empty file
    alert("File created.");
    loadItemsFromLocalStorage(); // Refresh the table
}

function createNewFolder() {
    const newFolderName = document.getElementById("new-file-name").value.trim();
    if (newFolderName === "") {
        alert("Folder name cannot be empty.");
        return;
    }

    const fullPath = currentPath + newFolderName + '.folder';
    if (localStorage.getItem(fullPath) !== null) {
        alert("A folder with this name already exists.");
        return;
    }

    localStorage.setItem(fullPath, ""); // Create an empty folder
    alert("Folder created.");
    loadItemsFromLocalStorage(); // Refresh the table
}

function viewItem(key) {
    const modal = document.getElementById("modal");
    const content = document.getElementById("file-content");
    const saveButton = document.getElementById("save-button");
    const deleteButton = document.getElementById("delete-button");
    const backButton = document.getElementById("back-button");
    const renameButton = document.getElementById("rename-button");
    const viewHtmlButton = document.getElementById("view-html-button");
    const fullScreenHtmlButton = document.getElementById("full-screen-html-button");

    content.value = localStorage.getItem(currentPath + key);
    saveButton.onclick = () => saveItem(key);
    deleteButton.onclick = () => {
        deleteItem(key);
        modal.style.display = "none";
    };
    backButton.onclick = () => {
        modal.style.display = "none";
    };
    renameButton.onclick = () => renameItem(key);
    viewHtmlButton.onclick = () => openHtmlBox(content.value);
    fullScreenHtmlButton.onclick = () => openFullScreenHtml(content.value);

    modal.style.display = "block";
}

function saveItem(key) {
    const content = document.getElementById("file-content").value;
    localStorage.setItem(currentPath + key, content);
    alert("Item saved.");
    loadItemsFromLocalStorage(); // Refresh the table
}

function deleteItem(key) {
    localStorage.removeItem(currentPath + key);
    alert("Item deleted.");
    loadItemsFromLocalStorage(); // Refresh the table
}

function renameItem(oldKey) {
    const newKey = prompt("Enter new name for the file:", oldKey);
    if (newKey === null || newKey.trim() === "") {
        alert("File name cannot be empty.");
        return;
    }

    const fullPathOldKey = currentPath + oldKey;
    const fullPathNewKey = currentPath + newKey;
    if (fullPathNewKey !== fullPathOldKey && localStorage.getItem(fullPathNewKey) !== null) {
        alert("A file with this name already exists.");
        return;
    }

    const value = localStorage.getItem(fullPathOldKey);
    localStorage.setItem(fullPathNewKey, value);
    localStorage.removeItem(fullPathOldKey);
    alert("File renamed.");
    loadItemsFromLocalStorage(); // Refresh the table
}

function navigateToFolder(folderName) {
    currentPath += folderName + '.folder/';
    document.getElementById('title').innerText = `Index of LocalStorage${currentPath ? '/' + currentPath : ''}Content`;
    document.getElementById('header').innerText = `Index of LocalStorage${currentPath ? '/' + currentPath : ''}Content`;
    loadItemsFromLocalStorage();
}

function navigateBack() {
    const parts = currentPath.split('/').filter(part => part !== '');
    parts.pop();
    currentPath = parts.join('/') + (parts.length > 0 ? '/' : '');
    document.getElementById('title').innerText = `Index of LocalStorage${currentPath ? '/' + currentPath : ''}Content`;
    document.getElementById('header').innerText = `Index of LocalStorage${currentPath ? '/' + currentPath : ''}Content`;
    loadItemsFromLocalStorage();
}

// Close the modal when the user clicks the close button
document.querySelector('.close').onclick = () => {
    document.getElementById('modal').style.display = "none";
};

// Function to open HTML content in a box
function openHtmlBox(htmlContent) {
    const htmlBox = document.getElementById('html-box');
    htmlBox.innerHTML = htmlContent;
    htmlBox.style.display = 'block';
}

// Function to open HTML content in full screen
function openFullScreenHtml(htmlContent) {
    const fullScreenHtml = document.getElementById('full-screen-html');
    const fullScreenHtmlContent = document.getElementById('full-screen-html-content');
    fullScreenHtmlContent.innerHTML = htmlContent;
    fullScreenHtml.style.display = 'block';
}

// Close the full-screen HTML view
document.querySelector('#full-screen-html .close').onclick = () => {
    document.getElementById('full-screen-html').style.display = 'none';
};

// Drag and drop functionality for file input
const dropZone = document.getElementById('tbody');
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
});

// Function to read file content
function readFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const content = reader.result;
        // Add file content to LocalStorage
        const fileName = prompt("Enter name for the file:", file.name);
        if (fileName) {
            const fullPath = currentPath + fileName;
            localStorage.setItem(fullPath, content);
            loadItemsFromLocalStorage();
        }
    };
    reader.onerror = () => {
        alert('Ошибка чтения файла!');
    };
    reader.readAsText(file);
}