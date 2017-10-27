(function ($) {
    "use strict";

    var Filelisting = function(element, options) {
        this.$capiton = $(element).find('.plugin__filelisting_capiton');
        this.$collapsible = $(element).find('.plugin__filelisting_collapsible');
        this.$content = $(element).find('.plugin__filelisting_content');

        this.options = $.extend({}, $.fn.dokuwiki_plugin_filelisting.defaults, options);

        this.storageKey = 'plugin_filelisting/' + this.options.pageId;

        this.initToggleButton();
        this.initAjaxDirectoryExpand();
        this.initFilter();
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
            this.$collapsible.hide();
            $toggleButton.text(this.options.toggleHidden);
        }

        $toggleButton.click($.proxy(function () {
            if (this.$collapsible.is(':hidden')) {
                this.$collapsible.slideDown();
                $toggleButton.text(this.options.toggleVisible);
                this.setToggleStatus('visible');
            } else {
                this.$collapsible.slideUp();
                $toggleButton.text(this.options.toggleHidden);
                this.setToggleStatus('hidden');
            }
        }, this));
    };

    Filelisting.prototype.initAjaxDirectoryExpand = function() {
        //global variables for tr click
        var options = this.options,
            $content = this.$content;
        this.$content.find('tbody').on('click', 'tr[data-namespace]', function (event) {
            event.preventDefault();

            var namespace = $(this).data('namespace'),
                //get all siblings and subsiblings
                children = $(this).nextAll('[data-childOf="' + namespace + '"]'),
                descendents = $(this).nextAll('[data-childOf^="' + namespace + '"]');

            //namespace is expanded - hide it
            if ($(this).data('isExpanded')) {
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
                $(this).data('isExpanded', false);

                //the content has changed
                $content.trigger('update');

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
                $(this).data('isExpanded', true);

                //the content has changed
                $content.trigger('update');

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
                        $(this).data('isExpanded', true);

                        //the content has changed
                        $content.trigger('update');
                    }, this), 'html')
                    .fail(function () {
                        $(this).children(':first').html(options.dirClosedIcon);
                    });
            }
        });
    };

    Filelisting.prototype.initFilter = function() {
        var $filterContainer = $('<div class="plugin__filelisting_filter">')
            .appendTo(this.$collapsible),
            $label = $('<label>').text(this.options.filterLabel + ': ')
                .appendTo($filterContainer);

        this.$filterInput = $('<input>').appendTo($label);

        //filter has changed, update content
        this.$filterInput.on('keyup', $.proxy(this.applyFilter, this));

        //bind filtering to content update event
        this.$content.on('update', $.proxy(this.applyFilter, this));
    };

    Filelisting.prototype.applyFilter = function() {
        var filter = this.$filterInput.val(),
            //escape regex
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
            escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // $& means the whole matched string
            globbing = escaped.replace('\\*', '.*').replace('\\?', '.'),
            regex = new RegExp(globbing);

        //don't filter directories
        this.$content.find('tbody tr').not('[data-namespace]').each(function () {
            //text in second column
            var text = $(this).find('td:eq(1) a').text();
            if (text.match(regex) && $(this).is(':hidden') && $(this).data('isFiltered')) {
                $(this).show();
                $(this).data('isFiltered', false);
            } else if (!text.match(regex) && $(this).is(':visible')) {
                $(this).hide();
                $(this).data('isFiltered', true);
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
        baseNamespace: '',
        filterLabel: 'Filter'
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