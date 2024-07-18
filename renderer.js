const toggleRecordButton = document.getElementById('toggle-record-button'); // Change to a single toggle button

toggleRecordButton.disabled = false;
let isRecording = false; // State to track recording status

toggleRecordButton.addEventListener('click', () => {
  isRecording = !isRecording; // Toggle the recording state
  toggleRecordButton.textContent = isRecording ? 'Stop Recording (ctrl + r)' : 'Start Recording (ctrl + r)'; // Update button text based on state
  if (isRecording) {
    recordStartTime = performance.now();
    // Start recording
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    // document.addEventListener('mousemove', handleMouseMove);
    // document.addEventListener('mousedown', handleMouseDown);
    // document.addEventListener('mouseup', handleMouseUp);
  } else {
    // Stop recording
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    // document.removeEventListener('mousemove', handleMouseMove);
    // document.removeEventListener('mousedown', handleMouseDown);
    // document.removeEventListener('mouseup', handleMouseUp);
    window.electronAPI.saveActions(updatedActions);
  }
});

const playButton = document.getElementById('play-button');
const actionsBody = document.getElementById('actions-body');
const keyInput = document.getElementById('key-input');
const bindKeyButton = document.getElementById('bind-key-button');

let recordStartTime = 0;
let updatedActions = [];
let isKeyBound = false; // Variable to indicate if a key is bound

document.addEventListener('keydown', function (event) {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault(); // Prevent the default action of Ctrl + S (usually save)
    isRecording = true;
    toggleRecordButton.textContent = 'Stop Recording';
    recordStartTime = performance.now();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  } else if (event.ctrlKey && event.key === 't') {
    event.preventDefault(); // Prevent the default action of Ctrl + S (usually save)
    isRecording = false;
    toggleRecordButton.textContent = 'Start Recording';
    startRecordButton.disabled = false;
    stopRecordButton.disabled = true;
    isKeyBound = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
    window.electronAPI.saveActions(updatedActions);
  }
});

playButton.addEventListener('click', () => {
  window.electronAPI.playActions();
});

// Step 1: Capture the Key Input
let bindKey = ''; // Variable to store the key to bind
keyInput.addEventListener('keydown', function (event) {
  isKeyBound = false; // Reset isKeyBound to false when a new key is pressed
  const isLetter = /^[a-zA-Z]$/; // Regular expression to check if the key is a letter
  if (isLetter.test(event.key)) {
    event.preventDefault(); // Prevent default to not type in input
    bindKey = event.key; // Store the pressed key
    document.getElementById('key-input').value = bindKey; // Show the pressed key in the input field
  }
});

// Step 2: Bind the Key to the Button
bindKeyButton.addEventListener('click', function () {
  // Inform the user which key is bound, or handle the binding process
  if (bindKey !== '') { // Check if bindKey is not empty
    isKeyBound = true; // Set isKeyBound to true indicating a key has been bound
    // You can add additional logic here if needed
  } else {
    isKeyBound = false;
  }
});

// Step 3: Replace Play Button Click with Key Press
document.addEventListener('keydown', function (event) {
  if (bindKey != '' && isKeyBound && event.key === bindKey && !event.repeat) {
    event.preventDefault(); // Prevent default action of the key
    // Trigger the Play button's functionality
    // document.getElementById('play-button').click();
    window.electronAPI.playActions();
  }
});

// Attach a single event listener to the parent element for event delegation
actionsBody.addEventListener('click', function (event) {
  // Check if the clicked element is a delete button
  if (event.target.classList.contains('delete-button')) {
    const actionId = event.target.getAttribute('data-action-id');
    window.electronAPI.deleteAction(actionId);
    // Here you can add your logic to delete the action
    // For example, remove the row from the DOM, update the actions array, etc.
  }
});

function handleMouseMove(event) {
  const now = performance.now();
  const action = {
    id: now,
    type: 'mouse',
    x: event.clientX,
    y: event.clientY,
    delay: now - recordStartTime,
  };
  window.electronAPI.recordAction(action);
  updateActionsList(action);
}

function handleMouseDown(event) {
  const now = performance.now();
  const action = {
    id: now,
    type: 'mouse',
    x: event.clientX,
    y: event.clientY,
    button: event.button === 0 ? 'left' : 'right',
    state: 'down',
    delay: now - recordStartTime,
  };
  window.electronAPI.recordAction(action);
  updateActionsList(action);
}

function handleMouseUp(event) {
  const now = performance.now();
  const action = {
    id: now,
    type: 'mouse',
    x: event.clientX,
    y: event.clientY,
    button: event.button === 0 ? 'left' : 'right',
    state: 'up',
    delay: now - recordStartTime,
  };
  window.electronAPI.recordAction(action);
  updateActionsList(action);
}

function handleKeyDown(event) {
  const now = performance.now();
  const action = {
    id: now,
    type: 'keyboard',
    key: event.key,
    state: 'key down',
    delay: now - recordStartTime,
  };
  window.electronAPI.recordAction(action);
  updateActionsList(action);
}

function handleKeyUp(event) {
  const now = performance.now();
  const action = {
    id: now,
    type: 'keyboard',
    key: event.key,
    state: 'key up',
    delay: now - recordStartTime,
  };
  window.electronAPI.recordAction(action);
  updateActionsList(action);
}

function updateActionsList(action) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><div class="cell-wrapper">${action.type}</div></td>
    <td><div class="cell-wrapper ${!action.x || action.x === "" ? "none-background" : ""}">${action.x || ''}</div></td>
    <td><div class="cell-wrapper ${!action.y || action.y === "" ? "none-background" : ""}">${action.y || ''}</div></td>
    <td><div class="cell-wrapper ${!action.key || action.key === "" ? "none-background" : ""}">${action.key || ''}</div></td>
    <td><div class="cell-wrapper ${!action.button || action.button === "" ? "none-background" : ""}">${action.button || ''} ${action.state || ''}</div></td>
    <td><div class="cell-wrapper">${action.delay.toFixed(2)}</div></td>
    <td>
      <button class="delete-button" data-action-id="${action.id}">Delete</button>
    </td>
  `;
  actionsBody.appendChild(row);
}

window.electronAPI.onUpdateActions((event, actions) => {
  try {
    updatedActions = actions;
    actionsBody.innerHTML = '';
    for (const action of actions) {
      updateActionsList(action);
    }
  } catch (error) {
    console.error('Error updating actions:', error);
  }
});

const { ipcRenderer } = require('electron');

ipcRenderer.on('toggle-recording', (event, isRecording) => {
    if (isRecording) {
        // Start recording
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mouseup', handleMouseUp);
        toggleRecordButton.textContent = 'Stop Recording';
    } else {
        // Stop recording
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mouseup', handleMouseUp);
        toggleRecordButton.textContent = 'Start Recording';
        window.electronAPI.saveActions(updatedActions);
    }
});