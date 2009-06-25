/**
 * Tine 2.0
 * 
 * @package     Calendar
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @copyright   Copyright (c) 2007-2008 Metaways Infosystems GmbH (http://www.metaways.de)
 * @version     $Id$
 *
 */
 
Ext.ns('Tine.Calendar');

Tine.Calendar.AttendeeGridPanel = Ext.extend(Ext.grid.EditorGridPanel, {
    autoExpandColumn: 'user_id',
    clicksToEdit: 1,
    enableHdMenu: false,
    
    record: null,
    
    /**
     * @property {Number}
     */
    currentAccountId: null,
    /**
     * @property {Ext.data.Store}
     */
    attendeeStore: null,
    
    initComponent: function() {
        this.app = this.app ? this.app : Tine.Tinebase.appMgr.get('Calendar');
        
        this.currentAccountId = Tine.Tinebase.registry.get('currentAccount').accountId;
        
        this.title = this.app.i18n._('Attendee');
        this.plugins = this.plugins || [];
        this.plugins.push(new Ext.ux.grid.GridViewMenuPlugin({}));
        
        this.store = new Ext.data.SimpleStore({
            fields: Tine.Calendar.Model.AttenderArray,
            sortInfo: {field: 'user_id', direction: 'ASC'},
            listeners: {
                scope: this,
                update: this.onStoreUpdate,
                cellcontextmenu : this.onContextMenu,
                keydown: this.onKeyDown
            }
        });
        
        this.on('beforeedit', this.onBeforeAttenderEdit, this);
        
        this.initColumns();
        
        Tine.Calendar.AttendeeGridPanel.superclass.initComponent.call(this);
    },
    
    initColumns: function() {
        this.columns = [{
            id: 'role',
            dataIndex: 'role',
            width: 70,
            sortable: true,
            hidden: true,
            header: this.app.i18n._('Role'),
            renderer: this.renderAttenderRole.createDelegate(this)
        }, {
            id: 'quantity',
            dataIndex: 'quantity',
            width: 40,
            sortable: true,
            hidden: true,
            header: '&#160;',
            tooltip: this.app.i18n._('Quantity'),
            renderer: this.renderAttenderQuantity.createDelegate(this)
        }, {
            id: 'displaycontainer_id',
            dataIndex: 'displaycontainer_id',
            width: 200,
            sortable: false,
            hidden: true,
            header: Tine.Tinebase.tranlation._hidden('Saved in'),
            tooltip: this.app.i18n._('This is the calendar where the attender has saved this event in'),
            renderer: this.renderAttenderDispContainer.createDelegate(this),
            // disable for the moment, as updating calendarSelectWidget is not working in both directions
            editor2: new Tine.widgets.container.selectionComboBox({
                blurOnSelect: true,
                selectOnFocus: true,
                appName: 'Calendar',
                startNode: 'personalOf',
                getValue: function() {
                    if (this.container) {
                        // NOTE: the store checks if data changed. If we don't overwrite to string, 
                        //  the check only sees [Object Object] wich of course never changes...
                        var container_id = this.container.id;
                        this.container.toString = function() {return container_id;};
                    }
                    return this.container;
                },
                listeners: {
                    scope: this,
                    select: function(field, newValue) {
                        // the field is already blured, due to the extra chooser window. We need to change the value per hand
                        var selection = this.getSelectionModel().getSelectedCell();
                        if (selection) {
                            var row = selection[0];
                            this.store.getAt(row).set('displaycontainer_id', newValue);
                        }
                    }
                }
            })
        }, {
            id: 'user_type',
            dataIndex: 'user_type',
            width: 20,
            sortable: true,
            resizable: false,
            header: '&#160;',
            tooltip: this.app.i18n._('Type'),
            renderer: this.renderAttenderType.createDelegate(this)
        }, {
            id: 'user_id',
            dataIndex: 'user_id',
            width: 300,
            sortable: true,
            header: this.app.i18n._('Name'),
            renderer: this.renderAttenderName.createDelegate(this),
            editor: new Tine.Addressbook.SearchCombo({
                // at the moment we support accounts only
                internalContactsOnly: true,
                
                blurOnSelect: true,
                selectOnFocus: true,
                renderAttenderName: this.renderAttenderName,
                setValue: function(value) {
                    name = this.renderAttenderName(value) || '';
                    Tine.Addressbook.SearchCombo.prototype.setValue.call(this, name);
                },
                getValue: function() {
                    if (this.selectedRecord) {
                        // NOTE: the store checks if data changed. If we don't overwrite to string, 
                        //  the check only sees [Object Object] wich of course never changes...
                        var user_id = this.selectedRecord.get('account_id');
                        this.selectedRecord.toString = function() {return user_id;};
                    }
                    return this.selectedRecord;
                }
            })
        }, {
            id: 'status',
            dataIndex: 'status',
            width: 100,
            sortable: true,
            header: this.app.i18n._('Status'),
            renderer: this.renderAttenderStatus.createDelegate(this),
            editor: new Ext.form.ComboBox({
                typeAhead     : false,
                triggerAction : 'all',
                lazyRender    : true,
                editable      : false,
                mode          : 'local',
                value         : null,
                forceSelection: true,
                store         : [
                    ['NEEDS-ACTION', ('No response')],
                    ['ACCEPTED',     ('Accepted')   ],
                    ['DECLINED',     ('Declined')   ],
                    ['TENTATIVE',    ('Tentative')  ]
                ], 
                listeners: {
                    scope: this,
                    select: function(field) {
                        field.blur(true);
                        field.fireEvent('blur', field);
                    }
                }
                
            })
        }];
    },
    
    onBeforeAttenderEdit: function(o) {
        if (o.field == 'status') {
            // allow status setting if current user has editGrant to displaycontainer
            var dispContainer = o.record.get('displaycontainer_id');
            o.cancel = ! (dispContainer && dispContainer.account_grants && dispContainer.account_grants.editGrant);
            return;
        }
        
        if (o.field == 'displaycontainer_id') {
            if (! o.value || ! o.value.account_grants || ! o.value.account_grants.deleteGrant) {
                o.cancel = true;
            }
            return;
        }
        
        if (! this.record.get('editGrant')) {
            o.cancel = true;
            return;
        }
        
        // don't allow to set anything besides quantity for persistent attendee
        if (o.record.get('id')) {
            o.cancel = true;
            if (o.field == 'quantity' && o.record.get('user_type') == 'resource') {
                o.cancel = false;
            }
            return;
        }
        
        if (o.field == 'user_id') {
            // here we are!
        }
    },
    
    // NOTE: Ext docu seems to be wrong on arguments here
    onContextMenu: function(e, target) {
        var row = this.getView().findRowIndex(target);
        var attender = this.store.getAt(row);
        if (attender) {
            // don't delete 'add' row
            var attender = this.store.getAt(row);
            if (! attender.get('user_id')) {
                return;
            }
                        
            var menu = new Ext.menu.Menu({
                items: [{
                    text: this.app.i18n._('Remove Attender'),
                    iconCls: 'action_delete',
                    scope: this,
                    disabled: !this.record.get('editGrant'),
                    handler: function() {
                        this.store.removeAt(row);
                    }
                    
                }]
            });
            menu.showAt(e.getXY());
        }
    },
    
    onRecordLoad: function(record) {
        this.record = record;
        this.store.removeAll(attendee);
        var attendee = record.get('attendee');
        Ext.each(attendee, function(attender) {
            this.store.add(new Tine.Calendar.Model.Attender(attender, attender.id));
        }, this);
        
        if (record.get('editGrant')) {
            this.store.add([new Tine.Calendar.Model.Attender(Tine.Calendar.Model.Attender.getDefaultData(), 'new-' + Ext.id() )]);
        }
    },
    
    onRecordUpdate: function(record) {
        
        var attendee = [];
        this.store.each(function(attender) {
            var user_id = attender.getUserId();
            if (user_id) {
                var data = attender.data;
                
                data.user_id = user_id;
                
                if (data.id && data.id.match(/new/)) {
                    data.id = 0;
                }
                
                attendee.push(data);
            }
        }, this);
        
        record.set('attendee', '');
        record.set('attendee', attendee);
    },
    
    /**
     * 
     * @param {} store
     * @param {} updatedAttender
     */
    onStoreUpdate: function(store, updatedAttender) {
        
        // check if we need to add a new row
        var needUpdate = true;
        this.store.each(function(attender) {
            var userId = attender.getUserId();
            //var userType = attender.get('user_type');
            
            if (! attender.getUserId()) {
                needUpdate = false;
            }
            
            if (updatedAttender.getUserId() == userId && updatedAttender.get('user_type') == attender.get('user_type')) {
                var last = this.store.getAt(this.store.getCount() -1);
                
                if (last != attender && last.id.match(/new/)) {
                    //duplicate entry
                    this.getView().focusCell(this.store.indexOf(attender), 3);
                    this.store.remove.defer(50, this.store, [last]);
                    needUpdate = true;
                    return false;
                }
            }
        }, this);
        
        if (needUpdate && this.record.get('editGrant')) {
            this.store.add([new Tine.Calendar.Model.Attender(Tine.Calendar.Model.Attender.getDefaultData(), 'new-' + Ext.id() )]);
        }
        
        // check if displaycontainer of owner got changed
        if (updatedAttender.getUserId() == this.currentAccountId && updatedAttender.get('user_type') == 'user') {
            this.record.set('container_id', '');
            this.record.set('container_id', updatedAttender.get('displaycontainer_id'));
        }
        
    },
    
    onKeyDown: function(e) {
        switch(e.getKey()) {
            
            case e.DELETE: {
                if (this.record.get('editGrant')) {
                    var selection = this.getSelectionModel().getSelectedCell();
                    
                    if (selection) {
                        var row = selection[0];
                        
                        // don't delete 'add' row
                        var attender = this.store.getAt(row);
                        if (! attender.get('user_id')) {
                            return;
                        }

                        this.store.removeAt(row);
                    }
                }
            }
        }
    },
    
    renderAttenderName: function(name) {
        if (name) {
            if (typeof name.get == 'function' && name.get('n_fn')) {
                return name.get('n_fn');
            }
            if (name.accountDisplayName) {
                return name.accountDisplayName;
            }
            return name;
            
        }
        // add new user:
        if (arguments[1]) {
            arguments[1].css = 'x-form-empty-field';
            return this.app.i18n._('Click here to invite another attender...');
        }
    },
    
    renderAttenderDispContainer: function(displaycontainer_id, metadata, attender) {
        metadata.attr = 'style: "overflow: none;"';
        
        if (displaycontainer_id) {
            if (displaycontainer_id.name) {
                return Ext.util.Format.htmlEncode(displaycontainer_id.name).replace(/ /g,"&nbsp;");
            } else {
                metadata.css = 'x-form-empty-field';
                return this.app.i18n._('No Information');
            }
        }
    },
    
    renderAttenderQuantity: function(quantity, metadata, attender) {
        return quantity > 1 ? quantity : '';
    },
    
    renderAttenderRole: function(role) {
        switch (role) {
            case 'REQ':
                return this.app.i18n._('Required');
                break;
            case 'OPT':
                return this.app.i18n._('Optional');
                break;
            default:
                return this.app.i18n._hidden(role);
                break;
        }
    },
    
    renderAttenderStatus: function(status, metadata, attender) {
        if (! attender.get('user_id')) {
            return '';
        }
        
        switch (status) {
            case 'NEEDS-ACTION':
                return this.app.i18n._('No response');
                break;
            case 'ACCEPTED':
                return this.app.i18n._('Accepted');
                break;
            case 'DECLINED':
                return this.app.i18n._('Declined');
                break;
            case 'TENTATIVE':
                return this.app.i18n._('Tentative');
                break;
            default:
                return this.app.i18n._hidden(status);
                break;
        }
    },
    
    renderAttenderType: function(type, metadata, attender) {
        switch (type) {
            case 'user':
                metadata.css = 'renderer_accountUserIcon';
                break;
            case 'group':
                metadata.css = 'renderer_accountGroupIcon';
                break;
            default:
                metadata.css = 'cal-attendee-type-' + type;
                break;
        }
        return '';
    }
});