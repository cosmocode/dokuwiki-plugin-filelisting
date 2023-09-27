<?php
/**
 * DokuWiki Plugin filelisting (Helper Component)
 *
 * @license GPL 2 http://www.gnu.org/licenses/gpl-2.0.html
 * @author  Szymon Olewniczak <dokuwiki@cosmocode.de>
 */

// must be run within Dokuwiki
if(!defined('DOKU_INC')) die();

class helper_plugin_filelisting extends DokuWiki_Plugin {

    /**
     * Display the file listing for the current page
     *
     * @param bool $print Should the HTML be printed or returned?
     *
     * @return string
     */
    public function tpl_filelisting($print = true, $ns = NULL) {
        global $INFO;
        global $lang;

        if (is_null($ns)) $ns = getNS($INFO['id']);

        if ($ns == false) {
            $ns = ':';
            $ns_string = '[' . $lang['mediaroot'] . ']';
        } else {
            $ns_string = $ns;
        }

        $colgroup = '<colgroup>';
        $colgroup .= '<col style="width: 22px;">';
        $colgroup .= '<col style="width: 25px;">';
        $colgroup .= '<col style="width: 50%;">';
        $colgroup .= '<col style="width: 15%;">';
        $colgroup .= '<col style="width: 35%;">';
        $colgroup .= '</colgroup>';

        $ret = '<div class="plugin__filelisting" data-namespace="' . $ns . '">';

        $ret .= '<div class="plugin__filelisting_capiton">';
        $ret .= sprintf($this->getLang('files_in_namespace'), $ns_string);
        $ret .= '</div>';

        //collapsible is for filter box (added dynamicly by JS)
        $ret .= '<div class="plugin__filelisting_collapsible">';

        //form for file deletion
        $form = new dokuwiki\Form\Form(['action' => wl($INFO['id'], '', false, '&')]);
        $form->addHTML('<div class="plugin__filelisting_content">');

        $form->addHTML('<div class="plugin__filelisting_headertable">');
        $form->addHTML('<table>');
        $form->addHTML($colgroup);
        $form->addHTML('<thead>');
        $form->addHTML('<tr>');
        //colspan for delete checkbox and icon
        $form->addHTML('<th colspan="2"></th>');
        $form->addHTML('<th>' . $this->getLang('header filename') .'</th>');
        $form->addHTML('<th>' . $this->getLang('header filesize') .'</th>');
        $form->addHTML('<th>' . $this->getLang('header filedate') .'</th>');
        $form->addHTML('</tr>');
        $form->addHTML('</thead>');
        $form->addHTML('</table>');
        $form->addHTML('</div>');

        $form->addHTML('<div class="plugin__filelisting_bodytable">');
        $form->addHTML('<table>');
        $form->addHTML($colgroup);
        $form->addHTML('<tbody>');

        $rowElements = $this->getFilesRows($ns);
        foreach($rowElements as $element) {
            $form->addElement($element);
        }
        $form->addHTML('</tbody>');
        $form->addHTML('</table>');
        $form->addHTML('</div>');

        //div.plugin__filelisting_content
        $form->addHTML('</div>');

        $form->addHTML('<div class="plugin__filelisting_footer">');
        //user can delete on this namespace
        $form->addButton('do[plugin_filelisting_delete]', $this->getLang('delete_selected'));
        $form->addHTML('</div>');

        $ret .= $form->toHTML();

        //div.plugin__filelisting_collapsible
        $ret .= '</div>';
        //div.plugin__filelisting
        $ret .= '</div>';

        if ($print) {
            echo $ret;
        }

        return $ret;
    }

    /**
     * Return namespace files as html table rows
     * @param string    $ns
     * @param int       $lvl
     * @param bool      $filesOnly if true, then the directories in a namespace are ignored
     * @return array    of \dokuwiki\Form\Element
     */
    public function getFilesRows($ns, $lvl=0, $filesOnly = false) {
        $files = $this->getFiles($ns);
        $elements = array();
        foreach ($files as $file) {
            //skip dirs
            if ($filesOnly && $file['isdir']) continue;

            //empty $ns means root
            $trOpen = new \dokuwiki\Form\TagOpenElement('tr', array('data-childOf' => $ns));
            if ($file['isdir']) {
                $trOpen->attr('data-namespace', $file['id']);
            }
            $elements[] = $trOpen;

            //delete checkbox
            $elements[] = new \dokuwiki\Form\TagOpenElement('td');
            if (!$file['isdir'] && $file['perm'] >= AUTH_DELETE) {
                $name = 'delete[' . $file['id'] . ']';
                $elements[] = new \dokuwiki\Form\CheckableElement('checkbox', $name, '');
            }
            $elements[] = new \dokuwiki\Form\TagCloseElement('td');

            $html = '<td class="plugin__filelisting_cell_icon">' . $file['icon'] . '</td>';
            $elements[] = new \dokuwiki\Form\HTMLElement($html);

            $td_name = new \dokuwiki\Form\TagOpenElement('td', array('data-sort' => $file['file']));
            $td_name->addClass('plugin__filelisting_cell_name');
            $elements[] = $td_name;

            if ($lvl > 0) {
                $html = '<span style="margin-left: ' . $lvl * 10 . 'px;">↳ </span>';
                $elements[] = new \dokuwiki\Form\HTMLElement($html);
            }
            $elements[] = new \dokuwiki\Form\HTMLElement($file['link']);
            $elements[] = new \dokuwiki\Form\TagCloseElement('td');

            if ($file['isdir']) {
                $elements[] = new \dokuwiki\Form\HTMLElement('<td data-sort=""> — </td>');
                $elements[] = new \dokuwiki\Form\HTMLElement('<td data-sort=""> — </td>');
            } else {
                $html = '<td data-sort="' . $file['size'] . '">' . filesize_h($file['size']) . '</td>';
                $elements[] = new \dokuwiki\Form\HTMLElement($html);
                $html = '<td data-sort="' . $file['mtime'] . '">' . dformat($file['mtime']) . '</td>';
                $elements[] = new \dokuwiki\Form\HTMLElement($html);
            }
            $elements[] = new \dokuwiki\Form\TagCloseElement('tr');
        }
        return $elements;
    }

    /**
     * Get a list of namespace files
     *
     * Suppress error messages for invalid file names: nothing to be done here,
     * they should be fixed in the media manager.
     *
     * @param $ns
     * @return array
     */
    public function getFiles($ns) {
        global $conf;

        $ns = cleanId($ns);

        $dir = utf8_encodeFN(str_replace(':','/',$ns));
        $data = array();
        search($data, $conf['mediadir'], array($this, 'search_media_and_namespaces'),
               array('showmsg' => false, 'depth' => 1), $dir, 1, false);

        return array_map(array($this, 'fileInfo'), $data);
    }

    /**
     * Add additional info to search() function result item
     *
     * @param $item
     * @return mixed
     */
    protected function fileInfo($item) {

        // Prepare filename
        $item['file'] = utf8_decodeFN($item['file']);

        //handle directory diffirently
        if (isset($item['isdir'])) {
            $item['icon'] = $this->dirClosedIcon();

            $item['link'] = '<a href="'.wl($item['id']. ':start').'">' . $item['file'] . '</a>';
        } else {
            // consistent info needed for rendering
            $item['isdir'] = false;
            // Prepare fileicons
            list($ext) = mimetype($item['file'],false);
            $class = preg_replace('/[^_\-a-z0-9]+/i','_',$ext);
            $class = 'mf_' . $class;
            $item['icon'] = '<div style="width: 16px; height:16px;" class="' . $class . '"></div>';

            $item['link'] = '<a href="'.ml($item['id']).'" target="_blank">' . $item['file'] . '</a>';
        }

        return $item;
    }

    /**
     * Html for closed dir icon
     *
     * @return false|string
     */
    public function dirClosedIcon() {
        return inlineSVG(dirname(__FILE__) . '/images/folder.svg');
    }

    /**
     * Html for opened dir icon
     *
     * @return false|string
     */
    public function dirOpenedIcon() {
        return inlineSVG(dirname(__FILE__) . '/images/folder-open.svg');
    }

    /**
     * Html for loading icon
     *
     * @return string
     */
    public function loadingIcon() {
        $file = dirname(__FILE__) . '/images/loading.gif';
        $contents = file_get_contents($file);
        $base64 = base64_encode($contents);
        return '<img src="data:image/gif;base64,'.$base64.'">';
    }

    /**
     * List all mediafiles in a namespace
     *   $opts['depth']     recursion level, 0 for all
     *   $opts['showmsg']   shows message if invalid media id is used
     *   $opts['skipacl']   skip acl checking
     *   $opts['pattern']   check given pattern
     *   $opts['hash']      add hashes to result list
     *
     *
     * @param array $data
     * @param string $base
     * @param string $file
     * @param string $type
     * @param integer $lvl
     * @param array $opts
     *
     * @return bool
     */
    public function search_media_and_namespaces(&$data,$base,$file,$type,$lvl,$opts){

        if ($type == 'd') {
            $info = array();

            $info['id']    = pathID($file,true);
            $info['file']  = utf8_basename($file);
            $info['isdir'] = true;

            //check ACL for namespace
            $info['perm'] = auth_quickaclcheck($info['id'].':*');

            if(!empty($opts['skipacl']) || $info['perm'] >= AUTH_READ){
                $data[] = $info;
            }
        }

        return search_media($data, $base, $file, $type, $lvl, $opts);
    }

    public function delete_files($files_to_delete) {
        global $lang;
        global $INFO;

        $msgs = array();
        foreach ($files_to_delete as $DEL) {
            $res = media_delete($DEL, $INFO['perm']);
            if ($res & DOKU_MEDIA_DELETED) {
                $msg = sprintf($lang['deletesucc'], noNS($DEL));
                $msgs[] = array('message' => $msg, 'lvl' => 1);
            } elseif ($res & DOKU_MEDIA_INUSE) {
                    $msg = sprintf($lang['mediainuse'],noNS($DEL));
                    $msgs[] = array('message' => $msg, 'lvl' => 0);
            } else {
                $msg = sprintf($lang['deletefail'],noNS($DEL));
                $msgs[] = array('message' => $msg, 'lvl' => -1);
            }
        }

        return $msgs;
    }

}

// vim:ts=4:sw=4:et:
