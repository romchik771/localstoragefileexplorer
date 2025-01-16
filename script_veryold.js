document.addEventListener('DOMContentLoaded', onLoad);

let currentPath = '';

function addRow(name, size, size_string, date_modified_string, isFolder = false) {
    if (name === "." || name === "..") return;

    const tbody = document.getElementById("tbody");
    const row = document.createElement("tr");
    const file_cell = document.createElement("td");
    const link = document.createElement("a");

    link.className = isFolder ? "icon dir" : "icon file";
    link.draggable = !isFolder;
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
    const name = el.innerText.replace(":", "");
    e.dataTransfer.setData("text/plain", name);
    e.dataTransfer.effectAllowed = "move";
}

function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

function onDrop(e) {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/plain");
    const sourcePath = currentPath + name;
    const targetPath = currentPath; // Drop in the current folder

    if (sourcePath === targetPath) return;

    const value = localStorage.getItem(sourcePath);
    if (value !== null) {
        localStorage.setItem(targetPath + name, value);
        localStorage.removeItem(sourcePath);
        loadItemsFromLocalStorage();
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