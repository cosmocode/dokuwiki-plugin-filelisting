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
    public function tpl_filelisting($print = true) {
        global $ID;
        global $lang;

        $ns = getNS($ID);
        if ($ns == false) {
            $ns_string = '[' . $lang['mediaroot'] . ']';
        } else {
            $ns_string = $ns;
        }

        $ret = '<div class="plugin__filelisting">';

        $ret .= '<div class="plugin__filelisting_capiton">';
        $ret .= sprintf($this->getLang('files_in_namespace'), $ns_string);
        $ret .= '</div>';

        //collapsible is for filter box (added dynamicly by JS)
        $ret .= '<div class="plugin__filelisting_collapsible">';
        $ret .= '<div class="plugin__filelisting_content">';
        $ret .= '<table>';

        $ret .= '<thead>';
        $ret .= '<tr>';
        $ret .= '<th></th>';
        $ret .= '<th>' . $this->getLang('header filename') .'</th>';
        $ret .= '<th>' . $this->getLang('header filesize') .'</th>';
        $ret .= '<th>' . $this->getLang('header filedate') .'</th>';
        $ret .= '</tr>';
        $ret .= '</thead>';

        $ret .= '<tbody>';
        $ret .= $this->getFilesRows($ns);
        $ret .= '</tbody>';

        $ret .= '</table>';
        $ret .= '</div>';

        //collapsible
        $ret .= '</div>';

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
     * @return string
     */
    public function getFilesRows($ns, $lvl=0) {
        $files = $this->getFiles($ns);
        $ret = '';
        foreach ($files as $file) {
            if ($file['isdir']) {
                $ret .= '<tr data-namespace="'.$file['id'].'"';
            } else {
                $ret .= '<tr';
            }
            //empty $ns means root
            $ret .= ' data-childOf="'.$ns.'">';

            $ret .= '<td>' . $file['icon'] . '</td>';

            $ret .= '<td>';
            if ($lvl > 0) {
                $ret .= '<span style="margin-left: ' . $lvl * 10 . 'px;">↳ </span>';
            }
            $ret .= $file['link'];
            $ret .= '</td>';

            $ret .= '<td>' . $file['size'] . '</td>';
            $ret .= '<td>' . $file['mtime'] . '</td>';
            $ret .= '</tr>';
        }
        return $ret;
    }

    /**
     * Get a list of namespace files
     *
     * @param $ns
     * @return array
     */
    public function getFiles($ns) {
        global $conf;

        $ns = cleanId($ns);

        $dir = utf8_encodeFN(str_replace(':','/',$ns));
        $data = array();
        search($data,$conf['mediadir'],array($this, 'search_media_and_namespaces'),
               array('showmsg'=>true,'depth'=>1),$dir,1, false);

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
            $item['size']  = '—';
            $item['mtime'] = '—';

            $item['link'] = '<a href="'.wl($item['id']. ':start').'">' . $item['file'] . '</a>';
        } else {
            // Prepare fileicons
            list($ext) = mimetype($item['file'],false);
            $class = preg_replace('/[^_\-a-z0-9]+/i','_',$ext);
            $class = 'mf_' . $class;
            $item['icon'] = '<div style="width: 16px; height:16px;" class="' . $class . '"></div>';

            $item['size'] = filesize_h($item['size']);
            $item['mtime'] = dformat($item['mtime']);

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

}

// vim:ts=4:sw=4:et:
