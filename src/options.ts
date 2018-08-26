const form = document.getElementById('the-form');
form.addEventListener('submit', e => {
    e.preventDefault();

    var formData = new FormData(form as HTMLFormElement);
    var object: any = {};
    formData.forEach(function(value, key){
        object[key] = value;
    });
    object.only_my_reactions = !!object.only_my_reactions;
    object.hide_gdrive_preview = !!object.hide_gdrive_preview;

    var json = JSON.stringify(object);

    chrome.storage.sync.set({
        'settings': json
    }, ()=>window.close());
});

setTimeout(()=>{
    chrome.storage.sync.get(['settings'], res => {
        const settings = JSON.parse(res.settings || '{}');

        let e: any = document.getElementById('hidden_ids');
        e.value = settings.hidden_ids;

        e = document.getElementById('only_my_reactions');
        if(settings.only_my_reactions){
            e.setAttribute('checked', true);
        }

        e = document.getElementById('hide_gdrive_preview');
        if(settings.hide_gdrive_preview){
            e.setAttribute('checked', true);
        }
    })
}, 100)