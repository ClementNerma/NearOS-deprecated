
var movingWindowDOM, resizingWidthWindowDOM, resizingHeightWindowDOM, lastMovingX, lastMovingY;

var Window = function(DOMWin, DOMTask) {

    /* To do : Check if the DOM is valid : it must be directly in #desktop and have class 'window' */

    var _DOMWin = $(DOMWin);
    var _DOMTask = $(DOMTask);

    _DOMWin.find('.title .close:first').click(function() {
        $(this).parent().parent().remove();
    });

    _DOMWin.find('.title:first').on('mousedown', function(event) {
        movingWindowDOM = $(this).parent();
        lastMovingX = event.clientX;
        lastMovingY = event.clientY;
        Window.unselectable(movingWindowDOM);
        return false;
    });

    _DOMWin.find('.title:first, .resizeWidth:first, .resizeHeight:first, .resizeAll:first').on('mouseup', function() {
        Window.selectable(movingWindowDOM || resizingHeightWindowDOM || resizingWidthWindowDOM);
        movingWindowDOM = null;
        resizingHeightWindowDOM = null;
        resizingWidthWindowDOM = null;
        return false;
    });

    _DOMWin.find('.resizeHeight:first').on('mousedown', function(event) {
        resizingHeightWindowDOM = $(this).parent();
        lastMovingY = event.clientY;
        Window.unselectable(resizingHeightWindowDOM);
    });

    _DOMWin.find('.resizeWidth:first').on('mousedown', function(event) {
        resizingWidthWindowDOM = $(this).parent();
        lastMovingY = event.clientY;
        Window.unselectable(resizingWidthWindowDOM);
    });

    _DOMWin.find('.resizeAll:first').on('mousedown', function(event) {
        resizingHeightWindowDOM = $(this).parent();
        resizingWidthWindowDOM = $(this).parent();
        lastMovingX = event.clientX;
        lastMovingY = event.clientY;
        Window.unselectable(resizingHeightWindowDOM);
    });

    this.setTitle = function(title) { _DOMWin.find('.title:first .title-content').text(title); _DOMTask.find('.title-content').text(title); };
    this.setContent = function(content) { _DOMWin.find('.content:first').html(content); };
    this.close = function() { _DOMWin.remove(); _DOMTask.remove(); };
    this.DOM = function() { return _DOMWin; };

    Object.freeze(this);

};

Window.selectable = function(DOM) {
    return $('body').attr('unselectable', 'off').css('user-select', 'all').on('selectstart', function(){return true;});
};

Window.unselectable = function(DOM) {
    return $('body').attr('unselectable', 'on').css('user-select', 'none').on('selectstart', false);
};

$('body').on('mousemove', function(event) {

    if(movingWindowDOM) {
        movingWindowDOM.css({
            top: (parseInt(movingWindowDOM.css('top').substr(0, movingWindowDOM.css('top').length - 2)) + (event.clientY - lastMovingY)) + 'px',
            left: (parseInt(movingWindowDOM.css('left').substr(0, movingWindowDOM.css('left').length - 2)) + (event.clientX - lastMovingX)) + 'px'
        });
    }

    if(resizingWidthWindowDOM) {
        resizingWidthWindowDOM.css({
            width: (parseInt(resizingWidthWindowDOM.css('width').substr(0, resizingWidthWindowDOM.css('width').length - 2)) + (event.clientX - lastMovingX)) + 'px'
        });
    }

    if(resizingHeightWindowDOM) {
        resizingHeightWindowDOM.css({
            height: (parseInt(resizingHeightWindowDOM.css('height').substr(0, resizingHeightWindowDOM.css('height').length - 2)) + (event.clientY - lastMovingY)) + 'px'
        });

        var r = resizingHeightWindowDOM.css('height');
        resizingHeightWindowDOM.find('iframe.application').css('height', (parseInt(r.substr(0, r.length - 2)) - 32) + 'px');

    }

    lastMovingX = event.clientX;
    lastMovingY = event.clientY;

});
