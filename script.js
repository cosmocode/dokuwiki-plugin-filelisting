(function ($) {
    "use strict";

    var Filelisting = function(element, options) {
        this.$capiton = $(element).find('.plugin__filelisting_capiton');
        this.$content = $(element).find('.plugin__filelisting_content');

        this.options = $.extend({}, $.fn.dokuwiki_plugin_filelisting.defaults, options);

        this.storageKey = 'plugin_filelisting/' + this.options.pageId;

        this.initToggleButton();
    };

    Filelisting.prototype.getToggleStatus = function () {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, this.options.defaultToggle);
        }
        return localStorage.getItem(this.storageKey);
    };

    Filelisting.prototype.setToggleStatus = function (status) {
        if (status !== 'visible' && status !== 'hidden') {
            throw 'status must be "visible" or "hidden"';
        }
        localStorage.setItem(this.storageKey, status);
    };

    Filelisting.prototype.initToggleButton = function() {
        //toggle button
        var $toggleButton = $('<div>').text(this.options.toggleVisible)
            .css({
                float: 'right',
                cursor: 'pointer'
            }).appendTo(this.$capiton);

        //by default filelisting is visible
        if (this.getToggleStatus() === 'hidden') {
            this.$content.hide();
            $toggleButton.text(this.options.toggleHidden);
        }

        $toggleButton.click($.proxy(function () {
            if (this.$content.is(':hidden')) {
                this.$content.slideDown();
                $toggleButton.text(this.options.toggleVisible);
                this.setToggleStatus('visible');
            } else {
                this.$content.slideUp();
                $toggleButton.text(this.options.toggleHidden);
                this.setToggleStatus('hidden');
            }
        }, this));
    };

    $.fn.dokuwiki_plugin_filelisting = function (options) {
        //return jquery object
        return this.each(function() {
            new Filelisting(this, options);
        });
    };

    $.fn.dokuwiki_plugin_filelisting.defaults = {
        toggleVisible: '▼',
        toggleHidden: '▲',
        pageId: '', //toggle status is global by default
        defaultToggle: 'visible'
    };

}(window.jQuery));

jQuery(function() {

    //read JSINFO
    var options = {};
    try {
        options.pageId = JSINFO.id;
    } catch (e) {
        console.log('filelisting: JSINFO.id undefined');
    }

    try {
        var defaulttoggle = JSINFO.plugin.filelisting.conf.defaulttoggle;
        if (defaulttoggle === '1') {
            options.defaultToggle = 'visible';
        } else {
            options.defaultToggle = 'hidden';
        }
    } catch (e) {
        console.log('filelisting: JSINFO.plugin.filelisting.conf.defaulttoggle undefined');
    }

    jQuery('.plugin__filelisting').dokuwiki_plugin_filelisting(options);
});