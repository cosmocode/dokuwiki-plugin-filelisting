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
        this.initSorting();
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
        //allow click on link
        this.$content.find('tbody').on('click', 'tr[data-namespace] a', $.proxy(function (event) {
            event.preventDefault();

            //row and namespace are used in $.post
            var $row = $(event.target).closest('tr'),
                namespace = $row.data('namespace');

            //get all siblings and subsiblings
            var $children = $row.nextAll('[data-childOf="' + namespace + '"]'),
                $descendants = $row.nextAll('[data-childOf^="' + namespace + '"]');

            //namespace is expanded - hide it
            if ($row.data('isExpanded')) {
                //set icon
                $row.children(':first').html(this.options.dirClosedIcon);
                //save the state of all expanded sub namespaces to restore it as it was
                $descendants.each(function () {
                     if ($(this).is(':visible')) {
                         $(this).data('reopenAs', 'visible');
                     } else {
                         $(this).data('reopenAs', 'hidden');
                     }
                 }).hide();
                $row.data('isExpanded', false);

            //namespace is hidden and is loaded
            } else if ($row.data('isLoaded')) {
                $row.children(':first').html(this.options.dirOpenedIcon);
                //always open children
                $children.show();
                //check if we should open any descendents
                $descendants.each(function() {
                    if ($(this).data('reopenAs') === 'visible') {
                        $(this).show();
                    }
                });
                $row.data('isExpanded', true);

                //expand content
                this.$content.trigger('expand', namespace);

            //namespace isn't loaded
            } else {
                //loading
                $row.children(':first').html(this.options.loadingIcon);

                var data = {};

                data['call'] = 'plugin_filelisting';
                data['namespace'] = namespace;
                data['baseNamespace'] = this.options.baseNamespace;

                $.post(DOKU_BASE + 'lib/exe/ajax.php', data,
                    $.proxy(function(html) {
                        $row.children(':first').html(this.options.dirOpenedIcon);
                        $row.after(html);
                        $row.data('isLoaded', true);
                        $row.data('isExpanded', true);

                        //trigger nsload then expand
                        $.when(this.$content.trigger('nsload', namespace))
                            .then($.proxy(function () {
                                this.$content.trigger('expand', namespace)
                            }, this));
                    }, this), 'html')
                    .fail($.proxy(function () {
                        $row.children(':first').html(this.options.dirClosedIcon);
                    }, this));
            }
        }, this));

        this.$content.on('namespaceFilesChanged', $.proxy(function (event, namespace) {
            var $row = $('tr[data-namespace="'+namespace+'"]');
            if ($row.length && !$row.data('isLoaded')) {
                return;
            }

            var data = {};

            data['call'] = 'plugin_filelisting';
            data['namespace'] = namespace;
            data['baseNamespace'] = this.options.baseNamespace;
            data['filesOnly'] = true;

            $.post(DOKU_BASE + 'lib/exe/ajax.php', data,
                $.proxy(function(html) {
                    var fileRows = jQuery(html);
                    if ($row && !$row.data('isExpanded')) {
                        fileRows.hide();
                    }
                    var $filesInNamespace = $('tr[data-childOf="'+namespace+'"]').not('[data-namespace]');
                    if ($filesInNamespace.length) {
                        // there are already files in the namespace: replace them
                        $filesInNamespace.first().replaceWith(fileRows);
                        $filesInNamespace.remove();
                    } else if ($('tr[data-childOf="'+namespace+'"]').length) {
                        // there are no files, but other folders in the namespace: insert after them
                        $('tr[data-childOf="'+namespace+'"]').last().after(fileRows);
                    } else {
                        // tbody is currently empty: append to it
                        this.$content.find('tbody').append(fileRows);
                    }

                    this.$content.trigger('nsload', namespace);
                }, this), 'html');
        }, this))
    };

    Filelisting.prototype.initFilter = function() {
        //global filter container
        this.$filterContainer = $('<div class="plugin__filelisting_filter">')
            .appendTo(this.$collapsible);

        var $label = $('<label>').text(this.options.filterLabel + ': ')
                .appendTo(this.$filterContainer),
            $filterInput = $('<input>').appendTo($label);

        //filter has changed, update content
        $filterInput.on('keyup', $.proxy(this.applyFilter, this));

        //bind filtering to content update event
        this.$content.on('expand', $.proxy(this.applyFilter, this));
    };

    Filelisting.prototype.applyFilter = function() {
        var filter = this.$filterContainer.find('input').val(),
            //escape regex
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Using_Special_Characters
            escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // $& means the whole matched string
            globbing = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.'),
            regex = new RegExp(globbing),
            $rows = this.$content.find('tbody tr'),
            $files = $rows.not('[data-namespace]'),
            $dirs = $rows.not($files),
            filterCallback = function() {
                //text in second column
                var $row = $(this),
                    text = $row.find('td:eq(1) a').text();
                if (text.match(regex)) {
                    $row.show();
                } else {
                    $row.hide();
                }
            };

        //files in root namespace are always visible
        $files.filter('[data-childOf=""]').each(filterCallback);

        //get namespaces
        $dirs.filter(function() {
            //only expanded
            return $(this).data('isExpanded');
        }).each(function () {
            var namespace = $(this).data('namespace');
            $files.filter('[data-childOf="' + namespace + '"]').each(filterCallback);
        });
    };

    Filelisting.prototype.initSorting = function() {
        //global: current sort header
        //not defined by default
        this.$sortHeader = [];

        //create sort links (for styling purposes)
        this.$content.find('thead th').wrapInner('<a href="#">');
        //sorting indicator
        this.$content.find('thead th a').prepend('<span>');

        //options for click
        this.$content.find('thead th a').on('click', $.proxy(function() {
            this.$sortHeader = $(event.target).closest('th');

            var $order = this.$sortHeader.find('span');
            //clear other sorting indicators
            this.$content.find('thead th').not(this.$sortHeader).find('span').text('');

            //toggle sort ordering
            if ($order.text() === '' || $order.text() === this.options.sortDesc) {
                $order.text(this.options.sortAsc);
            } else {
                $order.text(this.options.sortDesc);
            }
            //perform sorting
            this.sortBy();
        }, this));

        //bind sorting to content update event
        this.$content.on('nsload', $.proxy(function(event, namespace) {
            this.sortBy(namespace);
        }, this));
    };

    Filelisting.prototype.sortBy = function(namespace) {
        //don't sort where sortHeader not defined
        if (this.$sortHeader.length === 0) return;
        //by default sort starts from the base namespace
        if (namespace === undefined) {
            namespace = this.options.baseNamespace;
        }

        var $root = this.$content.find('tbody tr[data-namespace="' + namespace + '"]'),
            $rows = this.$content.find('tbody tr[data-childOf="' + namespace + '"]'),
            $files = $rows.not('[data-namespace]'),
            $dirs = $rows.not($files),
            sortCallback = $.proxy(function (a, b) {
                var index = this.$sortHeader.index(),
                    order = 1; //1 ascending order, -1 descending order

                //check for desc sorting
                if (this.$sortHeader.find('span').text() === this.options.sortDesc) {
                    order = -1;
                }

                var dataA = $(a).find('td').eq(index).data('sort'),
                    dataB = $(b).find('td').eq(index).data('sort');
                //$.data automatically converts string to integer when possible
                if (dataA < dataB) {
                    return -order;
                } else if (dataA > dataB) {
                    return order;
                }
                return 0;
            }, this);

        //sort dirs
        $dirs.sort(sortCallback);
        //sort files
        $files.sort(sortCallback);

        //we are on top level
        if ($root.length === 0) {
            this.$content.find('tbody').append($dirs, $files);
        } else {
            $root.after($dirs, $files);
        }

        //attach files to corresponding dirs
        $dirs.each($.proxy(function(index, element) {
            var namespace = $(element).data('namespace'),
                $descendants = $(element).siblings('[data-childOf^="' + namespace + '"]');
            $descendants.insertAfter(element);

            //sort sub namespaces
            this.sortBy(namespace);
        }, this));
    };


    $.fn.dokuwiki_plugin_filelisting = function (options) {
        //return jquery object
        return this.each(function() {
            new Filelisting(this, options);
        });
    };

    $.fn.dokuwiki_plugin_filelisting.defaults = {
        //label for visible list
        toggleVisible: '▼',
        //label for hidden list
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
        //label of filter input
        filterLabel: 'Filter',
        //sort ascending label
        sortAsc: '↓',
        //sort descending label
        sortDesc: '↑'
    };

}(window.jQuery));

jQuery(function() {

    //read JSINFO and LANG
    if (JSINFO === undefined || LANG === undefined) {
        console.log('filelisting: JSINFO or LANG undefined');
        return;
    }
    var options = {};

    options.pageId = JSINFO.id;

    var defaulttoggle = JSINFO.plugin.filelisting.defaulttoggle;
    if (defaulttoggle === '1') {
        options.defaultToggle = 'visible';
    } else {
        options.defaultToggle = 'hidden';
    }

    options.dirOpenedIcon = JSINFO.plugin.filelisting.dirOpenedIcon;
    options.dirClosedIcon = JSINFO.plugin.filelisting.dirClosedIcon;
    options.loadingIcon = JSINFO.plugin.filelisting.loadingIcon;

    options.baseNamespace = JSINFO.namespace;

    options.filterLabel = LANG.plugins.filelisting.filter_label;

    jQuery('.plugin__filelisting').dokuwiki_plugin_filelisting(options);
});
