(function(){
  function enhanceSelects(root){
    var scope = root || document;
    var sels = scope.querySelectorAll('select.input:not([data-native]):not([data-enhanced])');
    for (var i=0;i<sels.length;i++) enhance(sels[i]);
  }

  function enhance(sel){
    sel.setAttribute('data-enhanced','1');

    var wrap = document.createElement('div');
    wrap.className = 'custom-select';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);

    sel.style.position='absolute';
    sel.style.opacity='0';
    sel.style.pointerEvents='none';
    sel.style.width='0';
    sel.style.height='0';
    sel.tabIndex = -1;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-select__btn input flex items-center justify-between';
    var label = document.createElement('span');
    label.className = 'custom-select__label';
    label.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
    var icon = document.createElement('i');
    icon.className = 'bi bi-chevron-down opacity-80';
    btn.appendChild(label); btn.appendChild(icon);

    var list = document.createElement('div');
    list.className = 'custom-select__list';
    for (var j=0;j<sel.options.length;j++){
      var opt = sel.options[j];
      var item = document.createElement('div');
      item.className = 'custom-select__opt';
      item.setAttribute('role','option');
      item.textContent = opt.textContent;
      if (opt.value === sel.value) item.setAttribute('aria-selected','true');
      (function(value, text, item){
        item.addEventListener('click', function(e){
          e.stopPropagation();
          sel.value = value;
          var ev = document.createEvent('HTMLEvents');
          ev.initEvent('change', true, false);
          sel.dispatchEvent(ev);
          label.textContent = text;
          closeAll();
        });
      })(opt.value, opt.textContent, item);
      list.appendChild(item);
    }

    wrap.appendChild(btn);
    wrap.appendChild(list);

    function open(){
      closeAll();
      wrap.classList.add('open');
      var selected = list.querySelector('[aria-selected="true"]');
      if (selected && selected.scrollIntoView) selected.scrollIntoView({block:'nearest'});
    }
    function close(){ wrap.classList.remove('open'); }
    function toggle(){ wrap.classList.contains('open') ? close() : open(); }
    function closeAll(){
      var opens = document.querySelectorAll('.custom-select.open');
      for (var k=0;k<opens.length;k++) opens[k].classList.remove('open');
    }

    btn.addEventListener('click', function(e){ e.stopPropagation(); toggle(); });
    document.addEventListener('click', closeAll);

    sel.addEventListener('change', function(){
      label.textContent = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
      var items = list.querySelectorAll('.custom-select__opt');
      for (var q=0;q<items.length;q++){
        if (sel.options[q] && sel.options[q].value === sel.value) items[q].setAttribute('aria-selected','true');
        else items[q].removeAttribute('aria-selected');
      }
    });
  }

  window.enhanceSelects = enhanceSelects;

  function start(){
    enhanceSelects(document);
    var scheduled = false;
    var mo = new MutationObserver(function(){
      if (scheduled) return;
      scheduled = true;
      setTimeout(function(){ scheduled=false; enhanceSelects(document); }, 0);
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
