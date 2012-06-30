/*global Viva*/

Viva.BrowserInfo = (function(){
    if (typeof navigator === 'undefined') {
        return {
            browser : '',
            version : '0'
        };
    }
    
    var ua = navigator.userAgent;
    
    // Useragent RegExp
    var rwebkit = /(webkit)[ \/]([\w.]+)/;
    var ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
    var rmsie = /(msie) ([\w.]+)/;
    var rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
    
    ua = ua.toLowerCase();

    var match = rwebkit.exec( ua ) ||
                ropera.exec( ua ) ||
                rmsie.exec( ua ) ||
                ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) || [];

    return { 
        browser: match[1] || "", 
        version: match[2] || "0" 
    };
})();
