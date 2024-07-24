import ConfigData from './ConfigData.js';
import COMMANDS from './commands.js';

// API KEY VALIDATION + HANDLING

async function validateApiKey(apiKey) {
  // if the passed apiKey is an InputEvent this function was called via the input listener,
  // so get the value from the input field, otherwise use the passed apiKey
  const key = (apiKey instanceof InputEvent) ? document.getElementById('apiKey').value : apiKey;
  if (!key || key === '' || key.length !== 36) return markApiKeyError();
  if (await checkApiKey(key) === false) return markApiKeyError();
  
  // instance is valid, remove the error class
  document.getElementById('apiKey').classList.remove('input-validation-error');
  return true;
}

function markApiKeyError() {
  document.getElementById('apiKey').classList.add('input-validation-error');
  disableDropdown('instance');
  disableDropdown('command');
  return false
}

async function checkApiKey(key) {
  const data = await fetchInstances(key);
  if (!data) return false
  return true
}

async function handleApiKeyInput(event) {
  const apiKey = document.getElementById('apiKey').value;
  await saveConfigByKey('apiKey', apiKey);
  await reloadInstances()
}


// INSTANCE HANDLING

async function fetchInstances(key) {
  const myHeaders = new Headers();
  myHeaders.append("x-api-key", key);
  
  const requestOptions = {
    method: "GET",
    headers: myHeaders,
    redirect: "follow"
  };
  try {
    // Call the API endpoint
    const response = await fetch("https://cybersole.io/api/instances", requestOptions);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    return false
  }
}

async function reloadInstances() {
  const apiKey = document.getElementById('apiKey').value;
  const validated = await validateApiKey(apiKey);

  if (validated) {
    const data = await fetchInstances(apiKey);
    if (!data) throw new Error('Error fetching instances or no instances found');
    buildDropdown(data, 'instance')
    buildDropdown(COMMANDS, 'command')
  }
}

// INPUT/DROPDOWN HANDLING

async function buildDropdown(data, id) {
  if (!data || !id) return

  // show the command and instance fields
  const instanceField = document.getElementById(`${id}-select-field`);
  instanceField.classList.remove('hidden');

    // Get the dropdown container and clear it
  const dropdownContainer = document.getElementById(`${id}-dropdown`);
  dropdownContainer.innerHTML = '';

  // Iterate through the data and create the dropdown items
  data.forEach(item => {
    // Create the dropdown item div
    const dropdownItem = document.createElement('div');
    dropdownItem.className = 'dropdown-item';
    dropdownItem.setAttribute('value', `${item.name}:${item.id}`);

    // Create the selector span
    const selectorSpan = document.createElement('span');
    selectorSpan.className = 'selector';
    dropdownItem.appendChild(selectorSpan);

    // Create the item span
    const itemSpan = document.createElement('span');
    itemSpan.className = 'item';
    itemSpan.textContent = item.name;
    dropdownItem.appendChild(itemSpan);

    // Append the dropdown item to the container
    dropdownContainer.appendChild(dropdownItem);
  });
}

function toggleDropdown(event) {
  const closestDropdownDiv = event.target?.closest('[id^="custom-dropdown-"]');
  if (!closestDropdownDiv) return;
  
  const dropdowns = closestDropdownDiv.getElementsByClassName("dropdown-content");
  for (let i = 0; i < dropdowns.length; i++) {
    const openDropdown = dropdowns[i];
    if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
    } else {
      openDropdown.classList.add('show');
    }
  }
}

async function updateSelectedDropdown(target) {
  const closestDropdownDiv = target?.closest('[id^="custom-dropdown-"]');
  if (!closestDropdownDiv) return;

  const closestDropdownItem = target?.closest('.dropdown-item');
  if (closestDropdownItem) {
    const rawValue = closestDropdownItem.getAttribute('value');
    const [ label, value ]  = rawValue.split(':')
    closestDropdownDiv.querySelector('#selected-dropdown-item-label').innerHTML = label;
    closestDropdownDiv.querySelector('#value').value = rawValue;

    const dataLabel = closestDropdownDiv.dataset.label;
    if (dataLabel) await saveConfigByKey(dataLabel, rawValue);
  }
}

function setDropdownSelection(id, value) {
  if (!id || !value) return;
  const dropdown = document.getElementById(`custom-dropdown-${id}`)
  dropdown.querySelector('#value').value = value;
  const label = dropdown.querySelector('#selected-dropdown-item-label');
  label.innerHTML = value.split(':')[0];
}

function getDropdownSelection(id) {
  const dropdown = document.getElementById(`custom-dropdown-${id}`)
  const value = dropdown.querySelector('#value').value
  return value;
}

function disableDropdown(id) {
  const commandField = document.getElementById(`${id}-select-field`);
  commandField.classList.add('hidden');
  // clear the instance value too
  const commandDropdown = document.getElementById(`custom-dropdown-${id}`)
  commandDropdown.querySelector('#value').value = ''
  saveConfig();
}

// SAVING AND RESTORING CONFIG

// Saves config to chrome.storage
function saveConfig() {
  const apiKey = document.getElementById('apiKey').value;
  const instance = getDropdownSelection('instance')
  const command = getDropdownSelection('command')

  const config = new ConfigData({ apiKey, instance, command });

  // Save it using the Chrome extension storage API.
  chrome.storage.sync.set({ data: config }, function() {});
}

async function saveConfigByKey(key, value) {
  const config = await loadConfig();
  config[key] = value;
  chrome.storage.sync.set({ data: config }, function() {});
}

async function loadConfig() {
  const data = await chrome.storage.sync.get({
    data: {}
  });
  return new ConfigData(data.data);
}

// Restores config from chrome.storage
async function restoreConfig() {
  const config = await loadConfig();
  document.getElementById('apiKey').value = config.apiKey || '';

  if (await validateApiKey(config.apiKey)) {
    buildDropdown(COMMANDS, 'command')
    setDropdownSelection('command', config.command);
    const data = await fetchInstances(config.apiKey);
    if (!data) throw new Error('Error fetching instances or no instances found');
    buildDropdown(data, 'instance')
    setDropdownSelection('instance', config.instance);
  }
}

// UTIL AND TESTING

// unused - fields will save on update
function disableControlButtons() {
  const controls = document.getElementById('control-buttons');
  controls.classList.add('hidden');
}


// PAGE INITIALIZATION

document.addEventListener('DOMContentLoaded', restoreConfig);
document.addEventListener('DOMContentLoaded', disableControlButtons);

document.getElementById('api-key-reload-button').addEventListener('click', reloadInstances);
document.addEventListener('click', (event) => {
  toggleDropdown(event);
  if (event && event.target) {
    updateSelectedDropdown(event.target);
  }
});
document.getElementById('apiKey').addEventListener('input', handleApiKeyInput);
document.getElementById('save').addEventListener('click', saveConfig);