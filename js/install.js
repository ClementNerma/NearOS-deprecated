
/* Install virtual board and set up environment */

var current_app = '';
var downloadCallback;
var apps = ['Explorer', 'QuickEdit'];

/**
 * Download the next native application
 */

function downloadApp() {

    if(!apps.length) {
        /* All applications are installed ! */
        $('#downloadedApps').remove();
        return downloadCallback();
    }

    current_app = apps[0];
    apps.splice(0, 1);

    $('#status').text('Downloading native application : ' + current_app);
    board.console.log('Downloading : ' + current_app);

    /* Request server for getting application [current_app] */
    $.ajax({
        url: 'server/get-app.php?app=' + current_app,
        method: 'GET',
        timeout: 10000,
        success: function(data) {
            try {
                /* Try to parse data */
                data = JSON.parse(data);
            }
            catch(e) {
                /* data are not JSON data */
                $('#wait').remove();
                $('#status').text(' Cannot install application : ' + current_app + ' (Internal server error)').addClass('fa fa-exclamation-circle');
                return;
            }

            /* Data are now parsed as a JSON object */

            /* Try to install downloaded application package and to create a shortcut on the user's desktop */
            if(!board.applications.installPackage(data, true)) {
                /* Installation failed */
                $('#wait').remove();
                $('#status').text(' Cannot install application : ' + current_app + ' (Internal system error)').addClass('fa fa-exclamation-circle');
                board.console.error('Cannot install application : ' + current_app + ' (Internal system error)');
                return;
            }

            /* Installation success ! */
            /* Say it to the user */
            $('#downloadedApps').append('<br />Successfully downloaded application : ' + current_app);
            board.console.info('Downloaded : ' + current_app);
            downloadApp();
        },
        error: function() {
            /* Server has internal error */
            $('#wait').remove();
            $('#status').text(' Cannot install application : ' + current_app).addClass('fa fa-exclamation-circle');
            board.console.error('Cannot install application : ' + current_app);
        }
    });

}

/* Check if system has been installed by checking if 'sys' directory exists */
if(!board.fs.existsDirectory('sys')) {
    /* The directory doesn't exists, so we have to install system on user's storage */
    var win = board.windows.create(null, 'Installation program', '<h1><span id="wait" class="fa fa-spinner fa-pulse"></span> <span id="status"></span></h1>');

    board.console.log('=== NearOS installator ===');

    /* Clear storage */
    $('#status').text('Clearing storage');
    board.console.log('Clearing storage')
    board.fs.clear();

    /* Create storage structure */
    $('#status').text('Creating storage structure');
    board.console.log('Creating storage structure...');
    board.fs.makeDirectory('sys');
    board.fs.makeDirectory('apps');
    board.fs.makeDirectory('temp');
    board.fs.makeDirectory('users');
    board.fs.makeDirectory('users/admin/desktop');
    board.fs.makeDirectory('users/admin/documents');
    // Create a 'hello world' document
    board.fs.writeFile('users/admin/documents/Welcome.txt', 'Welcome to online board !');
    /* Create default streams */
    board.fs.createStream('sys_log', true);
    board.fs.createStream('con_log_log', true);
    board.fs.createStream('con_log_info', true);
    board.fs.createStream('con_log_warn', true);
    board.fs.createStream('con_log_error', true);

    var masterPassword, success = false;

    while(!success) {
        masterPassword = prompt('Please input the new master password for this computer\nIt must be secured !!', '');

        if(!masterPassword) {
            alert('Please input a password !');
        } else if(masterPassword.length < 10) {
            alert('Your password is too weak : Minimum 10 characters');
        } else if(masterPassword.length > 30) {
            alert('Your password is too long, you may forget it : Maximum 30 characters');
        } else if(!masterPassword.match(/[a-z]/) || !masterPassword.match(/[A-Z]/)) {
            alert('Your password must contain uppercase and lowercase letters');
        } else if(!masterPassword.match(/[0-9]/)) {
            alert('Your password must contain digits');
        } else {
            alert('Your password is valid');
            success = true;
        }
    }

    masterPassword = CryptoJS.PBKDF2(masterPassword, masterPassword, {iterations: 2000}).toString();

    /* Create registry and default entries */
    $('#status').text('Creating registry...');
    board.console.log('Creating registry');
    board.fs.writeFile('sys/reg', JSON.stringify({}));
    board.registry.write('apps', {});
    board.registry.write('users', {
        admin: {
            rights: 3,
            password: masterPassword
        },

        system: {
            rights: 4,
            password: masterPassword
        }
    });
    board.registry.write('sys', {
        fs: {
            directory: {
                type: 'Directory',
                open: {app: 'Explorer'},
                icon: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACBElEQVR4nO3aPU/bQBwGcHdptw5InZG6s3Vo8zG6wsbQJhFKlKiC0Iiw0Uq8iGCfp9Iv0yIUnLcBueTuPgIDAy+H4/szxKERtlDSQK5Knkd65ORkxff/JZlsy0IQBEEQBImye3Qxt+dffdj3g9SOH6T2+xVByhH0aA8kvds8pZemZ/jnVP2bTzYPL22htSNJ24K0I3pHVw5XJukP69Bb07OMnANfLbiSuq4kGrOaSWpXOb0yPdNIYZwK0bc4LkAPgdM30zONFCZp9YmG77fLOC1ZFr0wPdtQcSWtPTEAuZK0K+gX43Rouo6kH0xQucrpzSQB/rdqJkgmItg8XH+OizKhR6vUz45gd8JyDMDhYWWvE1KpfUv5hoq10FBUbP49FgeP/dcD6/fnR2uFaC3psyfV1dYtbZ+FZPPwMAbw3Q8qubqirDfdXfEUbfndnzGAfF1VTG9uUs15Kg7w+eR6ZgAyyQCz8wsAQBJAuqbKpjdmFCDjqTXTGwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACYAkPVm/d7gwN3hXL33OMs0NV8HwOMA6Zra6J9QbCoqtcfreutmqH598L7UGv/aSf3SHPgbnKj4Q1Lp46v3GU9dRkJ6GhsNH2Rq6mMMwLIsa/H4/HX29/X8NHf56GIucXgEQRAEQWYud3mKIPK+2Vu9AAAAAElFTkSuQmCC',
                context_menu: {
                    Rename: {app: 'Explorer', args: ['rename', '${this}']},
                    'Move to trash': {app: 'Explorer', args: ['removeDirectory', '${this}']},
                    Properties: {app: 'Explorer', args: ['directoryProperties', '${this}']}
                }
            },

            file: {
                context_menu: {
                    Rename: {app: 'Explorer', args: ['rename', '${this}']},
                    'Move to trash': {app: 'Explorer', args: ['removeFile', '${this}']},
                    Properties: {app: 'Explorer', args: ['fileProperties', '${this}']}
                }
            },

            unknown: {
                icon: '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',

                context_menu: {
                    'Open with...': {app: 'Explorer', args: ['openWith', '${this}']}
                }
            },

            '.js': {
                language: 'javascript',
                description: 'JavaScript'
            },

            '.css': {
                language: 'css',
                description: 'Cascading Style Sheet'
            },

            '.html': {
                language: 'html',
                description: 'HyperText Markup Language'
            },

            '.coffee': {
                language: 'coffee',
                description: 'CoffeeScript'
            },

            '.txt': {
                language: 'plain_text'
            }
        }
    });

    /* Download native applications */
    $('#status').text('Downloading native applications...');
    board.console.log('Downloading native applications');
    board.console.log('=== NearOS installator downloads ===');
    $('h1').after('<div id="downloadedApps"></div>')

    downloadCallback = function() {
        /* Environment set up ! */
        $('#wait').remove();
        board.console.info('Successfully set up Online Board environment !');
        $('#status').text('Successfully set up Online Board environment !');
        $('#status').after('<div class="alert alert-info">Please refresh the page to use Online Board</div>');
    };

    /* Download the first app */
    downloadApp();

}
