/* pager_tab_memory by KouHiro kun */

/** @description Register pager tab element to script. Returns pager tab object.
 *  @params {element} element element to register
 *  @params {object} parentPager pager object to attatch pager tab
 *  @return {object}
 */
function PagerTab(element, parentPager){
  let pagerTab = this;
  this.object = element;
  this.items = [];
  this.refreshTab = function() {
    pagermemory_tab_setup(this);
  };

  this.parentPager = parentPager;
  this.parentPager.addPageListener(function(index) {
    pagermemory_tab_toggleTab(pagerTab, index);
  });
  this.parentPager.addPageSetChangeListener(function(validPageCount) {
    pagermemory_tab_setup(pagerTab);
  });

  pagermemory_tab_setup(this);
}

/** @description Internal call only. Sets up pager tab.
 *  @params {object} pagerTab pager tab object to set up
 */
function pagermemory_tab_setup(pagerTab) {
  let tabObject = pagerTab.object.querySelector('.pagermemory_tab_object');
  tabObject.style.display = 'none';
  for(var i = 0; i < tabObject.childNodes.length; i++){
    if(tabObject.childNodes[i].nodeType != 1) tabObject.childNodes[i].remove();
  }
  pagerTab.items = [];
  var currentlyAddedTabs = pagerTab.object.querySelectorAll('.pagermemory_added_tab');
  for(var i = 0; i < currentlyAddedTabs.length; i++){
    currentlyAddedTabs[i].remove();
  }
  for(var i = 0; i < pagerTab.parentPager.validPageCount; i++){
    let index = i;
    let tabEach = tabObject.cloneNode(true);
    let tabSelector = tabEach.childNodes;
    let titleElements = tabEach.querySelectorAll(' .pagermemory_tab_title');
    let title = pagerTab.parentPager.getPageTitle(i);

    titleElements[0].innerHTML = title;
    titleElements[1].innerHTML = title;
    tabEach.style.display = 'inline-block';
    tabEach.classList.remove('pagermemory_tab_object');
    tabEach.classList.add('pagermemory_added_tab');
    tabEach.addEventListener('click', function() {
      if(pagerTab.parentPager.flags.animating) return;
      pagermemory_tab_toggleTab(pagerTab, index);
      pagerTab.parentPager.selectPage(index, true);
    });
    pagerTab.items.push(tabEach);
    pagerTab.object.appendChild(tabEach);
  }

  pagermemory_tab_toggleTab(pagerTab, pagerTab.parentPager.getSelectedPageIndex());
}

/** @description selects specified tab.
 *  @params {object} pagerTab pager tab object to select
 *  @params {number} next position to select
 */
function pagermemory_tab_toggleTab(pagerTab, next) {
  for(var i = 0; i < pagerTab.items.length; i++){
    pagerTab.items[i].childNodes[0].style.display = 'block';
    pagerTab.items[i].childNodes[1].style.display = 'none';
  }
  pagerTab.items[next].childNodes[0].style.display = 'none';
  pagerTab.items[next].childNodes[1].style.display = 'block';
}
