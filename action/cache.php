<?php
/**
 * DokuWiki Plugin filelisting (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) {
    die();
}

class action_plugin_filelisting_cache extends DokuWiki_Action_Plugin
{

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     *
     * @return void
     */
    public function register(Doku_Event_Handler $controller)
    {
        $controller->register_hook('PARSER_CACHE_USE', 'BEFORE', $this, 'handle_parser_cache_use');
    }

    /**
     * [Custom event handler which performs action]
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     *
     * @return void
     */
    public function handle_parser_cache_use(Doku_Event $event, $param)
    {
        global $conf;
        /** @var cache_parser $cache */
        $cache = &$event->data;

        if(!isset($cache->page)) return;
        //purge only xhtml cache
        if($cache->mode != 'xhtml') return;
        //Check if it is an filelisting page
        $ns = p_get_metadata($cache->page, 'filelisting');
        if(!$ns) return;

        //add a media directories to dependencies
        $cache->depends['files'] = array_merge($cache->depends['files'], $ns);

    }
}

// vim:ts=4:sw=4:et: