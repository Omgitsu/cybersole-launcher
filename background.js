import _ from './js/lodash-es/lodash.js';

import ConfigData from './ConfigData.js';

chrome.action.onClicked.addListener(async (tab) => { 
  try {
    let tabs = await chrome.tabs.query({active: true, lastFocusedWindow: true}) //, tabs => {
    let url = _.first(tabs).url;
    await callAPI(url);
  } catch(err) {
    console.log(err)
  }
});

async function getConfigByKey(key) {
  const item = await chrome.storage.sync.get({ key: '' });
}

async function getConfig() {
  let data;
  try {
    data = await chrome.storage.sync.get({
      data: {}
    })
  } catch (err) {
    console.log(err);
  }
  const config = new ConfigData(data.data);
  console.log('loaded config', config)
  return config;
}

/*
  calls the Cybersole API with the given URL
  extend this function if you want to parse the URL for specific data
*/
async function callAPI(url) {
  let value = url;
  const config = await getConfig();
  if (
    !config.apiKey || config.apiKey.length <= 1 ||
    !config.instance || config.instance.length <= 1 ||
    !config.command || config.command.length <= 1
  ) {
    chrome.runtime.openOptionsPage();
    return;
  }

  const headers = {
    "accept": "*/*",
    "x-requested-with": "XMLHttpRequest",
    "Content-Type":  "application/json",
    "x-api-key": config.apiKey
  }

  // if command is for nike, strip the SKU from the value/url
  if (url.includes('.nike.') && config.command === 'CMD_NIKE_QUICKTASK') {
    const sku = url.split('/').pop();
    value = sku;
  }

  const body = {
    "name": config.command.split(':')[1],
    "value": value
  };


  var requestOptions = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    redirect: 'follow',
  };

  console.log(requestOptions)

  const apiURL = `https://cybersole.io/api/commands/${config.instance.split(':')[1]}`
  try {
    const response = await fetch(apiURL, requestOptions);
    console.log(await response.text());
  } catch(error) {
    console.error(error)
  }
}