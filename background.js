var NS = SpaceManager;

const browserApi = browser;
const constants = NS.constants;
const utils = NS.utils;

const store = new NS.classes.LocalWindowStateStore(browserApi, constants);
const settingsService = new NS.classes.ExtensionSettingsService(browserApi, constants);
const spaceService = new NS.classes.ContainerSpaceService(browserApi, constants, store);
const iconService = new NS.classes.ToolbarIconService(browserApi, constants, spaceService);
const switchService = new NS.classes.SpaceSwitchService(
  browserApi,
  constants,
  utils,
  store,
  spaceService,
  iconService,
  settingsService
);
const eventController = new NS.classes.BackgroundEventController(
  browserApi,
  spaceService,
  iconService,
  switchService
);
const messageController = new NS.classes.RuntimeMessageController(
  browserApi,
  spaceService,
  switchService,
  utils
);

eventController.register();
messageController.register();
