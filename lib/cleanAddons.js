function hasName(item) {
  if (item.name) {
    return true;
  } else {
    return false;
  }
}

function getDemoUrl(item) {
  if (item.latest['ember-addon']) {
    return item.latest['ember-addon'].demoURL;
  } else {
    return null;
  }
}

function getTimes(item) {
  return {
    created: item.created || null,
    modified: item.modified || null
  };
}

function getGithub(item) {
  if (item.github) {
    return {
      user: item.github.user,
      repo: item.github.repo
    };
  } else {
    return null;
  }
}

function getNpmUser(item) {
  return {
    name: item._npmUser.name,
    gravatar: item._npmUser.gravatar
  };
}

function getVersionCompatibility(item) {
  if (item.latest['ember-addon']) {
    return item.latest['ember-addon'].versionCompatibility;
  } else {
    return null;
  }
}

function pickAddonFields(addon) {
  return {
    _npmUser: getNpmUser(addon),
    demoURL: getDemoUrl(addon),
    description: addon.description,
    emberObserver: addon.emberObserver,
    github: getGithub(addon),
    name: addon.name,
    time: getTimes(addon),
    versionCompatibility: getVersionCompatibility(addon)
  };
}

function cleanAddons(addons) {
  const cleanedAddons = addons
    .filter(hasName)
    .map(pickAddonFields);

  return Promise.resolve(cleanedAddons);
}

module.exports = {
  cleanAddons,
  hasName
};
