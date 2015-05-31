
function fatal(error) {
    document.body.innerHTML = error;
    throw new Error(error);
}

function isset(name) {
    if(typeof name === 'string')
        return typeof window[name] !== 'undefined';

    if(typeof name === 'object') {
        for (var i in name) {
            if (typeof window[name[i]] === 'undefined')
                return false;
        }

        return true;

    }

}

if(!isset('$'))
    fatal('jQuery is not supported !');

if(!isset('localStorage'))
    fatal('localStorage is not supported !');
