/*!
 * Expresso Lite
 * Handles all contacts-related operations.
 *
 * @package   Lite
 * @license   http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author    Rodrigo Dias <rodrigo.dias@serpro.gov.br>
 * @copyright Copyright (c) 2013-2016 Serpro (http://www.serpro.gov.br)
 */

define([
    'common-js/jQuery',
    'common-js/App'
],
function($, App) {
    var Contacts = { };

    function _Hex2bin(hex) {
        var bytes = [];
        for (var i = 0; i < hex.length - 1; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return String.fromCharCode.apply(String, bytes);
    }

    function _GetContactByMail(mailAddr, people) {
        for (var p = 0; p < people.length; ++p) {
            for (var m = 0; m < people[p].emails.length; ++m) {
                if (mailAddr === people[p].emails[m]) {
                    return people[p];
                }
            }
        }
        return null;
    }

    function _ReadContactsList() {
        return JSON.parse(sessionStorage.getItem('contacts'));
    }

    function _WriteContactsList(contacts) {
        sessionStorage.setItem('contacts', JSON.stringify(contacts));
    }

    Contacts.updatePersonalCache = function(contacts) {
        var contactList = _ReadContactsList();
        for (var i = 0; i < contacts.length; ++i) {
            var con = _GetContactByMail(contacts[i], contactList);
            if (con === null) { // whole contact not cached yet, add new
                contactList.push({
                    name: Contacts.humanizeLogin(contacts[i], false),
                    emails: [ contacts[i] ]
                });
            }
        }
        _WriteContactsList(contactList);
    };

    Contacts.loadPersonal = function() {
        var defer = $.Deferred();
        App.post('getPersonalContacts').done(function(contacts) {
            _WriteContactsList(contacts);
            defer.resolve();
        });
        return defer.promise();
    };

    Contacts.loadMugshots = function(addrs) {
        var defer = $.Deferred();

        for (var a = addrs.length; a-- > 0; ) {
            var mugshot = sessionStorage.getItem('pic$'+addrs[a]);
            if (mugshot !== null) {
                addrs.splice(a, 1); // mugshot already cached, won't be queried
            }
        }

        if (addrs.length) {
            App.post('searchContactsByEmail', {
                emails: addrs.join(','),
                getPicture: '1'
            }).fail(function(resp) {
                App.errorMessage('Erro ao trazer a foto de um contato.', resp);
            }).done(function(contacts) {
                var people = _ReadContactsList();
                for (var i = 0; i < contacts.length; ++i) {
                    var con = _GetContactByMail(contacts[i].email, people);
                    if (con === null) { // whole contact not cached yet, add new
                        people.push({
                            name: contacts[i].name,
                            emails: [ contacts[i].email ]
                        });
                    }
                    sessionStorage.setItem('pic$'+contacts[i].email, contacts[i].mugshot);
                }
                defer.resolve();
            });
        } else {
            defer.resolve();
        }
        return defer.promise();
    };

    Contacts.getMugshotSrc = function(email) {
        var mugshot = sessionStorage.getItem('pic$'+email);
        if (mugshot === null || mugshot === '') {
            if (email.indexOf('serpro.gov.br') !== -1) {
                return '';
            }
            switch (email.substr(email.indexOf('@') + 1)) {
                case 'gmail.com': return '../img/person-gmail.png';
                case 'yahoo.com':
                case 'yahoo.com.br': return '../img/person-yahoo.png';
                case 'outlook.com':
                case 'hotmail.com': return '../img/person-outlook.png';
                case 'zabbix.com': return '../img/person-zabbix.png';
            }
            return (email.indexOf('.gov.br') !== -1) ? '../img/person-govbr.png' : '';
        } else {
            return 'data:image/jpeg;base64,'+_Hex2bin(mugshot); // src attribute of IMG
        }
    };

    Contacts.searchByToken = function(token) {
        token = token.toLowerCase();
        var ret = [];
        var people = _ReadContactsList();
        NEXTPEOPLE: for (var p = 0; p < people.length; ++p) {
            for (var m = 0; m < people[p].emails.length; ++m) { // search within email addresses
                if (people[p].emails[m].indexOf(token) !== -1) {
                    ret.push(people[p]);
                    continue NEXTPEOPLE;
                }
            }
            if (people[p].name.toLowerCase().indexOf(token) !== -1) { // search within name
                ret.push(people[p]);
            }
        }
        return ret;
    };

    Contacts.summary = function() {
        return console.info('Session storage usage:\n' +
            '- contacts: ' +
            (sessionStorage.getItem('contacts').length / 1024).toFixed(2)+' KB\n' +
            '- mugshots: ' +
            (JSON.stringify(sessionStorage).length / 1024).toFixed(2)+' KB'); // for debug purposes
    };

    Contacts.humanizeLogin = function(emailAddr, onlyFirstName) {
        function UppercaseFirst(name) { return name.charAt(0).toUpperCase() + name.substr(1); }

        var parts = emailAddr.substr(0, emailAddr.indexOf('@')).split(/[\.-]+/);
        if (onlyFirstName) {
            return UppercaseFirst(parts[0]); // jose.silva@brasil.gov -> "Jose"
        } else {
            var ret = '';
            for (var i = 0; i < parts.length; ++i) {
                ret += UppercaseFirst(parts[i]) + ' ';
            }
            return ret.substr(0, ret.length - 1); // jose.silva@brasil.gov -> "Jose Silva"
        }
    };

    return Contacts;
});
