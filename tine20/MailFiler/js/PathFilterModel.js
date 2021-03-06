/*
 * Tine 2.0
 * 
 * @license     http://www.gnu.org/licenses/agpl.html AGPL Version 3
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * @copyright   Copyright (c) 2010-2012 Metaways Infosystems GmbH (http://www.metaways.de)
 * 
 */
Ext.ns('Tine.MailFiler');

/**
 * @namespace   Tine.widgets.container
 * @class       Tine.MailFiler.PathFilterModel
 * @extends     Tine.widgets.grid.FilterModel
 * 
 * @author      Cornelius Weiss <c.weiss@metaways.de>
 * 
 * @TODO make valueRenderer a path picker widget
 */
Tine.MailFiler.PathFilterModel = Ext.extend(Tine.widgets.grid.FilterModel, {
    /**
     * @cfg {Tine.Tinebase.Application} app
     */
    app: null,
    
    /**
     * @cfg {Array} operators allowed operators
     */
    operators: ['equals'],
    
    /**
     * @cfg {String} field path
     */
    field: 'path',
    
    /**
     * @cfg {String} defaultOperator default operator, one of <tt>{@link #operators} (defaults to equals)
     */
    defaultOperator: 'equals',
    
    /**
     * @cfg {String} defaultValue default value (defaults to all)
     */
    defaultValue: '/',
    
    /**
     * @private
     */
    initComponent: function() {
        this.label = this.app.i18n._('path');
        
        Tine.MailFiler.PathFilterModel.superclass.initComponent.call(this);
    },
    
    /**
     * value renderer
     * 
     * @param {Ext.data.Record} filter line
     * @param {Ext.Element} element to render to 
     */
    valueRenderer: function(filter, el) {
        var value = new Ext.ux.form.ClearableTextField({
            filter: filter,
            width: this.filterValueWidth,
            id: 'tw-ftb-frow-valuefield-' + filter.id,
            renderTo: el,
            value: filter.data.value ? filter.data.value : this.defaultValue,
            emptyText: this.emptyText,
            value: filter.data.value
        });
        
        value.on('specialkey', function(field, e){
            if(e.getKey() == e.ENTER){
                this.onFiltertrigger();
            }
        }, this);
                
        value.origSetValue = value.setValue.createDelegate(value);
        value.setValue = function(value) {
            if (value && value.path) {
                value = value.path;
            }
            else if(Ext.isString(value) && (!value.charAt(0) || value.charAt(0) != '/')) {
                value = '/' + value;
            }
            
            return this.origSetValue(value);
        };
        
        return value;
    }
});

Tine.widgets.grid.FilterToolbar.FILTERS['tine.filemanager.pathfiltermodel'] = Tine.MailFiler.PathFilterModel;

