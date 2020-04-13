import UAParser from 'ua-parser-js';

let result = new UAParser().getResult();
let deviceType      = (result.device && result.device.type && result.device.type.toLowerCase()) || '';
let os              = (result.os && result.os.name && result.os.name.toLowerCase()) || '';
let browser         = (result.browser && result.browser.name && result.browser.name.toLowerCase()) || '';
let browserMajVer   = (result.browser && parseInt(result.browser.major, 10)) || 0;
let osMajVer        = parseInt(os.version, 10) || 0;
export default {
    deviceType: deviceType,
    os: os,
    osMajVer: osMajVer,
    browser: browser,
    browserMajVer: browserMajVer
};
