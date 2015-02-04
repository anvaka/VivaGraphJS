module.exports = browserInfo();

function browserInfo() {
  if (typeof window === "undefined" || !window.hasOwnProperty("navigator")) {
    return {
      browser : "",
      version : "0"
    };
  }

  var ua = window.navigator.userAgent.toLowerCase(),
  // Useragent RegExp
  rwebkit = /(webkit)[ \/]([\w.]+)/,
  ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
  rmsie = /(msie) ([\w.]+)/,
  rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,
  match = rwebkit.exec(ua) ||
    ropera.exec(ua) ||
    rmsie.exec(ua) ||
    (ua.indexOf("compatible") < 0 && rmozilla.exec(ua)) ||
    [];

  return {
    browser: match[1] || "",
    version: match[2] || "0"
  };
}
