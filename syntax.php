<?php
/**
 * DokuWiki Plugin filelisting (Syntax Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

use dokuwiki\File\PageResolver;

class syntax_plugin_filelisting extends DokuWiki_Syntax_Plugin {
    /**
     * @return string Syntax mode type
     */
    public function getType() {
        return 'substition';
    }

    /**
     * @return string Paragraph type
     */
    public function getPType() {
        return 'block';
    }

    /**
     * @return int Sort order - Low numbers go before high numbers
     */
    public function getSort() {
        return 13;
    }

    /**
     * Connect lookup pattern to lexer.
     *
     * @param string $mode Parser mode
     */
    public function connectTo($mode) {
        $this->Lexer->addSpecialPattern('{{filelisting>?.*?}}',$mode,'plugin_filelisting');
    }

    /**
     * Handle matches of the filelisting syntax
     *
     * @param string          $match   The match of the syntax
     * @param int             $state   The state of the handler
     * @param int             $pos     The position in the document
     * @param Doku_Handler    $handler The handler
     * @return array Data for the renderer
     */
    public function handle($match, $state, $pos, Doku_Handler $handler){
        $param = substr($match, strlen('{{filelisting'), -strlen('}}'));
        //remove '>' from the path
        $ns = strlen($param) !== 0 ? $ns = substr($param, 1) : '';

        return array($ns);
    }

    /**
     * Render xhtml output or metadata
     *
     * @param string         $mode      Renderer mode (supported modes: xhtml)
     * @param Doku_Renderer  $renderer  The renderer
     * @param array          $data      The data from the handler() function
     * @return bool If rendering was successful.
     */
    public function render($mode, Doku_Renderer $renderer, $data) {
        global $INFO;

        if ($mode == 'metadata') {
            //inform the cache that the plugin is used
            $renderer->meta['filelisting'] = true;

            return true;
        } elseif ($mode == 'xhtml') {

            $cur_ns = getNS($INFO['id']);

            list($ns) = $data;
            if (empty($ns)) {
                $ns = $cur_ns;
            } else {
                $resolver = new PageResolver($INFO['id']);
                $ns = $resolver->resolveId($ns);
            }

            /** @var helper_plugin_filelisting $hlp */
            $hlp = plugin_load('helper', 'filelisting');

            $renderer->doc .= $hlp->tpl_filelisting(false, $ns);

            return true;
        }
        return false;
    }
}

// vim:ts=4:sw=4:et:
