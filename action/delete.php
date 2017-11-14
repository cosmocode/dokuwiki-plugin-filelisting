<?php
/**
 * DokuWiki Plugin filelisting (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class action_plugin_filelisting_delete extends DokuWiki_Action_Plugin {

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller) {

        $controller->register_hook('ACTION_ACT_PREPROCESS', 'BEFORE', $this, 'handle_action_act_preprocess');

    }

    /**
     * Send the namespace files as html table rows
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */

    public function handle_action_act_preprocess(Doku_Event &$event, $param) {
        if(act_clean($event->data) != 'plugin_filelisting_delete') return;

        global $ACT;
        $ACT = 'show';

        if (!checkSecurityToken()) return;

        /** @var Input */
        global $INPUT;

        $files_to_delete = array_keys($INPUT->arr('delete'));

        /** @var helper_plugin_filelisting $filelisting */
        $filelisting = $this->loadHelper('filelisting');
        $msgs = $filelisting->delete_files($files_to_delete);
        foreach ($msgs as $msg) {
            msg($msg['message'], $msg['lvl']);
        }
    }
}

// vim:ts=4:sw=4:et:
