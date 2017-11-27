<?php
/**
 * DokuWiki Plugin filelisting (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class action_plugin_filelisting_js extends DokuWiki_Action_Plugin {

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller) {

        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER', $this, 'handle_dokuwiki_started');

    }

    /**
     * Set the JSINFO
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */

    public function handle_dokuwiki_started(Doku_Event &$event, $param) {
        //load conf
        $this->jsinfo('defaulttoggle', $this->getConf('defaulttoggle'));

        /** @var helper_plugin_filelisting $filelisting */
        $filelisting = $this->loadHelper('filelisting');

        $this->jsinfo('dirOpenedIcon', $filelisting->dirOpenedIcon());
        $this->jsinfo('dirClosedIcon', $filelisting->dirClosedIcon());
        $this->jsinfo('loadingIcon', $filelisting->loadingIcon());
        $this->jsinfo('remember_state_per_page', $this->getConf('remember_state_per_page') === 'page');
    }

    /**
     * Add a value to JSINFO['plugin'][plugin name]
     *
     * @param      $key
     * @param      $value
     */
    protected function jsinfo($key, $value) {
        global $JSINFO;

        $pname = $this->getPluginName();
        //using metadata convention
        if (!isset($JSINFO['plugin'])) $JSINFO['plugin'] = array();
        if (!isset($JSINFO['plugin'][$pname])) $JSINFO['plugin'][$pname] = array();

        $JSINFO['plugin'][$pname][$key] = $value;
    }
}

// vim:ts=4:sw=4:et:
