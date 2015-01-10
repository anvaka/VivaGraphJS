/**
 * Finds the absolute position of an element on a page
 */
module.exports = findElementPosition;

function findElementPosition(obj) {
    var curleft = 0,
        curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while ((obj = obj.offsetParent) !== null);
    }

    return [curleft, curtop];
}
