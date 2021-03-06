<?php
/**
 * Tine 2.0 - http://www.tine20.org
 *
 * @package     Setup
 * @license     http://www.gnu.org/licenses/agpl.html
 * @copyright   Copyright (c) 2008-2013 Metaways Infosystems GmbH (http://www.metaways.de)
 * @author      Philipp Schüle <p.schuele@metaways.de>
 *
 */

/**
 * Test helper
 */
require_once dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . 'TestHelper.php';

/**
 * Test class for Tinebase_Group
 */
class Setup_ControllerTest extends PHPUnit_Framework_TestCase
{
    /**
     * @var Setup_Frontend_Json
     */
    protected $_uit = null;
    
    /**
     * Sets up the fixture.
     * This method is called before a test is executed.
     *
     * @access protected
     */
    protected function setUp()
    {
        $this->_uit = Setup_Controller::getInstance();
    }

    /**
     * Tears down the fixture
     * This method is called after a test is executed.
     *
     * @access protected
     */
    protected function tearDown()
    {
        $testCredentials = Setup_TestServer::getInstance()->getTestCredentials();
        $this->_installAllApplications(array(
            'defaultAdminGroupName' => 'Administrators',
            'defaultUserGroupName'  => 'Users',
            'adminLoginName'        => $testCredentials['username'],
            'adminPassword'         => $testCredentials['password'],
        ));
    }
       
    /**
     * test uninstall application and cache clearing
     *
     */
    public function testUninstallApplications()
    {
        $cache = Tinebase_Core::getCache();
        $cacheId = 'unittestcache';
        $cache->save('something', $cacheId);
        
        try {
            $result = $this->_uit->uninstallApplications(array('ActiveSync'));
        } catch (Tinebase_Exception_NotFound $e) {
            $this->_uit->installApplications(array('ActiveSync'));
            $result = $this->_uit->uninstallApplications(array('ActiveSync'));
        }
        
        $this->assertFalse($cache->test($cacheId), 'cache is not cleared');

        $apps = $this->_uit->searchApplications();
        
        // get active sync
        foreach ($apps['results'] as $app) {
            if ($app['name'] == 'ActiveSync') {
                $activeSyncApp = $app;
                break;
            }
        }
        
        // checks
        $this->assertTrue(isset($activeSyncApp));
        $this->assertEquals('uninstalled', $activeSyncApp['install_status']);

        // cleanup
        $this->_uit->installApplications(array('ActiveSync'));
    }
    
    /**
     * testInstallAdminAccountOptions
     */
    public function testInstallAdminAccountOptions()
    {
        $this->_uninstallAllApplications();
        $this->_uit->installApplications(array('Tinebase'), array('adminLoginName' => 'phpunit-admin', 'adminPassword' => 'phpunit-password'));
        $adminUser = Tinebase_User::getInstance()->getFullUserByLoginName('phpunit-admin');
        $this->assertTrue($adminUser instanceof Tinebase_Model_User);
        
        $this->assertNull(Tinebase_Auth::getBackendConfiguration('adminLoginName'));
        $this->assertNull(Tinebase_Auth::getBackendConfiguration('adminPassword'));
        $this->assertNull(Tinebase_Auth::getBackendConfiguration('adminConfirmation'));
        
        // cleanup
        $this->_uninstallAllApplications();
    }
    
    /**
     * testSaveAuthenticationRedirectSettings
     */
    public function testSaveAuthenticationRedirectSettings()
    {
        $originalRedirectSettings = array(
            Tinebase_Config::REDIRECTURL => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTURL, ''),
            Tinebase_Config::REDIRECTTOREFERRER => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTTOREFERRER, FALSE)
        );
         
        $newRedirectSettings = array(
            Tinebase_Config::REDIRECTURL => 'http://tine20.org',
            Tinebase_Config::REDIRECTTOREFERRER => TRUE
        );
        
        $this->_uit->saveAuthentication(array('redirectSettings' => $newRedirectSettings));
        
        $storedRedirectSettings = array(
            Tinebase_Config::REDIRECTURL => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTURL),
            Tinebase_Config::REDIRECTTOREFERRER => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTTOREFERRER)
        );
        
        $configNames = array(Tinebase_Config::REDIRECTURL, Tinebase_Config::REDIRECTTOREFERRER);
        foreach ($configNames as $configName) {
            $this->assertEquals($storedRedirectSettings[$configName], $newRedirectSettings[$configName],
                'new setting should match stored settings: ' . print_r($newRedirectSettings, TRUE));
        }
        
        // test empty redirectUrl
        $newRedirectSettings = array(
            Tinebase_Config::REDIRECTURL => '',
            Tinebase_Config::REDIRECTTOREFERRER => FALSE
        );
        
        $this->_uit->saveAuthentication(array('redirectSettings' => $newRedirectSettings));
        
        $storedRedirectSettings = array(
            Tinebase_Config::REDIRECTURL => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTURL),
            Tinebase_Config::REDIRECTTOREFERRER => Tinebase_Config::getInstance()->get(Tinebase_Config::REDIRECTTOREFERRER)
        );
        
        foreach ($configNames as $configName) {
            $this->assertEquals($storedRedirectSettings[$configName], $newRedirectSettings[$configName],
                'new setting should match stored settings (with empty redirect URL): ' . print_r($newRedirectSettings, TRUE));
        }
        
        $this->_uit->saveAuthentication($originalRedirectSettings);
    }
    
    /**
     * testInstallGroupNameOptions
     */
    public function testInstallGroupNameOptions()
    {
        $this->_uninstallAllApplications();
        $testCredentials = Setup_TestServer::getInstance()->getTestCredentials();
        $this->_installAllApplications(array(
            'defaultAdminGroupName' => 'phpunit-admins',
            'defaultUserGroupName'  => 'phpunit-users',
            'adminLoginName'        => $testCredentials['username'],
            'adminPassword'         => $testCredentials['password'],
        ));
        $adminUser = Tinebase_Core::get('currentAccount');
        $this->assertEquals('phpunit-admins', Tinebase_User::getBackendConfiguration(Tinebase_User::DEFAULT_ADMIN_GROUP_NAME_KEY));
        $this->assertEquals('phpunit-users', Tinebase_User::getBackendConfiguration(Tinebase_User::DEFAULT_USER_GROUP_NAME_KEY));
        
        //cleanup
        $this->_uninstallAllApplications();
    }
    
    /**
     * test uninstall application
     *
     */
    public function testUninstallTinebaseShouldThrowDependencyException()
    {
        $result = $this->_uit->uninstallApplications(array('Tinebase'));
        $this->assertTrue($this->_uit->setupRequired());
    }
    
    /**
     * test search applications
     *
     */
    public function testSearchApplications()
    {
        $apps = $this->_uit->searchApplications();
        
        $this->assertGreaterThan(0, $apps['totalcount']);
        
        // get active sync
        foreach ($apps['results'] as $app) {
            if ($app['name'] == 'ActiveSync') {
                $activeSyncApp = $app;
                break;
            }
        }
        
        // checks
        $this->assertTrue(isset($activeSyncApp));
        $this->assertTrue(isset($activeSyncApp['id']));
        $this->assertEquals('uptodate', $activeSyncApp['install_status']);
    }
    
    /**
     * test install application
     *
     */
    public function testInstallApplications()
    {
        try {
            $result = $this->_uit->installApplications(array('ActiveSync'));
        } catch (Exception $e) {
            $this->_uit->uninstallApplications(array('ActiveSync'));
            $result = $this->_uit->installApplications(array('ActiveSync'));
        }
                
        $apps = $this->_uit->searchApplications();
        
        // get active sync
        foreach ($apps['results'] as $app) {
            if ($app['name'] == 'ActiveSync') {
                $activeSyncApp = $app;
                break;
            }
        }
        
        
        $applicationId = $activeSyncApp['id'];
        // checks
        $this->assertTrue(isset($activeSyncApp));
        $this->assertTrue(isset($applicationId));
        $this->assertEquals('enabled', $activeSyncApp['status']);
        $this->assertEquals('uptodate', $activeSyncApp['install_status']);
        
        //check if user role has the right to run the recently installed app
        $roles = Tinebase_Acl_Roles::getInstance();
        $userRole = $roles->getRoleByName('user role');
        $rights = $roles->getRoleRights($userRole->getId());
        $hasRight = false;
        foreach ($rights as $right) {
            if ($right['application_id'] === $applicationId &&
                $right['right'] === 'run') {
                $hasRight = true;
            }
        }
        $this->assertTrue($hasRight, 'User role has run right for recently installed app?');
    }

    /**
     * test update application
     *
     * @todo test real update process; currently this test case only tests updating an already uptodate application
     */
    public function testUpdateApplications()
    {
        $applications = new Tinebase_Record_RecordSet('Tinebase_Model_Application');
        $applications->addRecord(Tinebase_Application::getInstance()->getApplicationByName('ActiveSync'));
        $result = $this->_uit->updateApplications($applications);
        $this->assertTrue(is_array($result)); //Setup_Controller::updateApplications just returns an array of messages and throws exceptions on failure
    }

    /**
     * test env check
     *
     */
    public function testEnvCheck()
    {
        $result = $this->_uit->checkRequirements();
        
        $this->assertTrue(isset($result['success']));
        $this->assertGreaterThan(16, count($result['results']));
    }
    
    /**
     * testLoginWithWrongUsernameAndPassword
     *
     */
    public function testLoginWithWrongUsernameAndPassword()
    {
        $result = $this->_uit->login('unknown_user_xxyz', 'wrong_password');
        $this->assertFalse($result);
    }
    
    /**
     * uninstallAllApplications
     */
    protected function _uninstallAllApplications()
    {
        $installedApplications = Tinebase_Application::getInstance()->getApplications(NULL, 'id');
        $this->_uit->uninstallApplications($installedApplications->name);
    }
    
    /**
     * installAllApplications
     *
     * @param array $_options
     */
    protected function _installAllApplications($_options = null)
    {
        if (! $this->_uit) {
            throw new Setup_Exception('could not run test, Setup_Controller init failed');
        }
        
        $installableApplications = $this->_uit->getInstallableApplications();
        $installableApplications = array_keys($installableApplications);
        $this->_uit->installApplications($installableApplications, $_options);
    }

    /**
     * @see 11574: backup should only dump structure of some tables
     */
    public function testGetBackupStructureOnlyTables()
    {
        require_once __DIR__ . '/Controller_Mock.php';

        $setupControllerMock = new Setup_Controller_Mock();

        $tables = $setupControllerMock->getBackupStructureOnlyTables();

        $this->assertTrue(in_array(SQL_TABLE_PREFIX . 'felamimail_cache_message', $tables), 'felamimail tables need to be in _getBackupStructureOnlyTables');
    }
}
