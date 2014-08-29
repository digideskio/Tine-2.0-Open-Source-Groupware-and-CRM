<?php
/**
 * Tine 2.0
 *
 * @package     Crm
 * @subpackage  Setup
 * @license     http://www.gnu.org/licenses/agpl.html AGPL3
 * @copyright   Copyright (c) 2014 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Alexander Stintzing <a.stintzing@metaways.de>
 */
class Crm_Setup_Update_Release8 extends Setup_Update_Abstract
{
    /**
     * update to 8.1
     * 
     * - add resubmission date to lead
     */
    public function update_0()
    {
        $declaration = new Setup_Backend_Schema_Field_Xml('<field>
            <name>resubmission_date</name>
            <type>datetime</type>
        </field>');
        
        $this->_backend->addCol('metacrm_lead', $declaration);

        $this->setTableVersion('metacrm_lead', 8);
        
        $this->setApplicationVersion('Crm', '8.1');
    }
}