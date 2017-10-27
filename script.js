(function ($) {
    "use strict";

    var Filelisting = function(element, options) {
        this.$capiton = $(element).find('.plugin__filelisting_capiton');
        this.$content = $(element).find('.plugin__filelisting_content');

        this.options = $.extend({}, $.fn.dokuwiki_plugin_filelisting.defaults, options);

        this.storageKey = 'plugin_filelisting/' + this.options.pageId;

        this.initToggleButton();
        this.initAjaxDirectoryExpand();
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

    Filelisting.prototype.initAjaxDirectoryExpand = function() {
        var options = this.options;
        this.$content.find('tbody').on('click', 'tr[data-namespace]', function (event) {
            event.preventDefault();

            var namespace = $(this).data('namespace'),
                //get all siblings and subsiblings
                children = $(this).nextAll('[data-childOf="' + namespace + '"]'),
                descendents = $(this).nextAll('[data-childOf^="' + namespace + '"]');

            //namespace is expanded - hide it
            if (children.is(':visible')) {
                //set icon
                $(this).children(':first').html(options.dirClosedIcon);
                //save the state of all expanded sub namespaces to restore it as it was
                descendents.each(function () {
                     if ($(this).is(':visible')) {
                         $(this).data('reopenAs', 'visible');
                     } else {
                         $(this).data('reopenAs', 'hidden');
                     }
                 }).hide();
            //namespace is hidden and is loaded
            } else if ($(this).data('isLoaded')) {
                $(this).children(':first').html(options.dirOpenedIcon);
                //always open children
                children.show();
                //check if we should open any descendents
                descendents.each(function() {
                    if ($(this).data('reopenAs') === 'visible') {
                        $(this).show();
                    }
                });
            //namespace isn't loaded
            } else {
                //loading
                $(this).children(':first').html(options.loadingIcon);

                var data = {};

                data['call'] = 'plugin_filelisting';
                data['namespace'] = namespace;
                data['baseNamespace'] = options.baseNamespace;

                $.post(DOKU_BASE + 'lib/exe/ajax.php', data,
                    $.proxy(function(html) {
                        $(this).children(':first').html(options.dirOpenedIcon);
                        $(this).after(html);
                        $(this).data('isLoaded', true);
                    }, this), 'html')
                    .fail(function () {
                        $(this).children(':first').html(options.dirClosedIcon);
                    });
            }
        });
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
        //id of the current wiki page
        pageId: '',
        defaultToggle: 'visible',
        //html used as dir open icon
        dirOpenedIcon: '',
        //html used as dir close icon
        dirClosedIcon: '',
        //html used as loading icon for ajax call
        loadingIcon: '',
        //namespace of the current wiki page
        baseNamespace: ''
    };

}(window.jQuery));

jQuery(function() {

    //read JSINFO
    if (JSINFO === undefined) {
        console.log('filelisting: JSINFO undefined');
        return;
    }
    var options = {};

    options.pageId = JSINFO.id;

    var defaulttoggle = JSINFO.plugin.filelisting.conf.defaulttoggle;
    if (defaulttoggle === '1') {
        options.defaultToggle = 'visible';
    } else {
        options.defaultToggle = 'hidden';
    }

    options.dirOpenedIcon = JSINFO.plugin.filelisting.dirOpenedIcon;
    options.dirClosedIcon = JSINFO.plugin.filelisting.dirClosedIcon;
    options.loadingIcon = JSINFO.plugin.filelisting.loadingIcon;

    options.baseNamespace = JSINFO.namespace;

    jQuery('.plugin__filelisting').dokuwiki_plugin_filelisting(options);
});