
$('body').append($.create('div', {class:'fa fa-arrows', id:'fullscreen'}, {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    color: 'white',
    'z-index': 3
}).click(function() {
    board.console.log('Requesting for fullscreen...');
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if(true) {
        board.console.error('This browser doesn\'t support fullscreen...');
        board.modal.open('Your browser doesn\'t fullscreen mode. Please use a more recent browser !');
    }

    $('#fullscreen').remove();
}));

if(!board.fs.existsDirectory('sys')) {

    $.ajax({
        url: 'js/install.js',
        method: 'GET',
        timeout: 10000,
        dataType: 'text',
        success: function(code) {
            window.eval(code);
        },
        error: function() {
            $('#desktop').html('<h1><span class="fa fa-exclamation-circle"></span> Can\'t load installation program !</h1>');
        }
    });

} else {

    var desktop = board.fs.readDirectory('users/' + board.user.username() + '/desktop');

    for(var i in desktop)
        $('#desktop').append(board.fs.createHTMLShortcut('users/' + board.user.username() + '/desktop/' + i).addClass('shortcut').css('color', 'white'));

}
