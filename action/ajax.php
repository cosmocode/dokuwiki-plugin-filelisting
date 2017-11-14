<?php
/**
 * DokuWiki Plugin filelisting (Action Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class action_plugin_filelisting_ajax extends DokuWiki_Action_Plugin {

    /**
     * Registers a callback function for a given event
     *
     * @param Doku_Event_Handler $controller DokuWiki's event controller object
     * @return void
     */
    public function register(Doku_Event_Handler $controller) {

       $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle_ajax_call_unknown');
   
    }

    /**
     * Send the namespace files as html table rows
     *
     * @param Doku_Event $event  event object by reference
     * @param mixed      $param  [the parameters passed as fifth argument to register_hook() when this
     *                           handler was registered]
     * @return void
     */

    public function handle_ajax_call_unknown(Doku_Event &$event, $param) {
        if($event->data != 'plugin_filelisting') return;
        $event->preventDefault();
        $event->stopPropagation();

        global $INPUT;

        $ns = $INPUT->str('namespace');
        $baseNs = $INPUT->str('baseNamespace');
        $lvl = $this->getNumberOfSubnamespaces($ns) - $this->getNumberOfSubnamespaces($baseNs);

        /** @var helper_plugin_filelisting $filelisting */
        $filelisting = $this->loadHelper('filelisting');

        $elements = $filelisting->getFilesRows($ns, $lvl, $INPUT->bool('filesOnly'));
        foreach($elements as $element) {
            echo $element->toHTML();
        }
    }

    /**
     * Calculate the number of subnamespaces, the given namespace is consisting of
     *
     * @param string $namespace
     * @return int
     */
    protected function getNumberOfSubnamespaces($namespace) {
        $cleanedNamespace = trim($namespace, ':');
        if ($cleanedNamespace === '') {
            return 0;
        }
        return substr_count($cleanedNamespace, ':') + 1;
    }

}

// vim:ts=4:sw=4:et:
