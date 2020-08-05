window.onload = function(){
    $(".client-modal-link").css("color","#3B3DBF");
    $('.sum-quantity').each(function(){
        let item = $(this).attr('data-item');
        let size = $(this).attr('data-size');
        let sum = get_sum(item,size);
        $(this).text(sum);
    });
}

function get_sum(itm_code,size){
    let sum = 0
    $("."+itm_code+"-"+size).each(function() {
        sum = sum + Number($( this ).attr('data-current_qty'));
    });
    return sum
}

$(".client-modal-link").click(function(){
    let data_array = ["country","city","phone","email","cusname"];
    for (let k=0;k<data_array.length;k++){
        $("#modal-"+data_array[k]).text($(this).attr("data-"+data_array[k]));
    }
    $("#client-modal").modal('show');
});