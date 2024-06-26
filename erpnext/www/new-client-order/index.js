var tablecount = 1;
var profoma = null;
var numeric = /^\d+$/;

// $('#addtable').click(() => {
//     $($('.product-table')[0]).clone().addClass('class', 'product-table').appendTo('#container')
//     tablecount++
//     $('.selected-product').click(productUpdateCallback)
//     setClose()
// })

$('#addtable').click((e) => {
    e.preventDefault();
    $($('.product-table')[0]).clone().find("input:text").val("").end().addClass('class', 'product-table').appendTo('#table_container')
    tablecount++
    $('.selected-product').click(productUpdateCallback)
    setClose()
})

$(".show-file-selector").on('click', function () {
    $(this).siblings('.file-input').click();
})

$('.close').click(e => console.log($(e.target).parent()))

const productUpdateCallback = (e) => {
    // console.log($(e.target).parent().parent().parent().parent().find('.table-section')[0])
    product = $(e.target).find("option:selected").val()
    $(e.target).closest('.product-table').attr('id', product)
    frappe.call({
        method: 'erpnext.stock.sizing.getSizes',
        args: {
            item: product
        },
        callback: function (r) {
            if (!r.exc) {
                let table = generateSizingTable(r.message.sizes)
                // console.log(table)
                $(e.target).parent().parent().parent().parent().find('.table-section').html(table)
                {% if isCustomer and not isBrand %}
                $('.modified-qty>td>input').attr('disabled', true)
                {% endif %}
                $('.qty>td>input').change(priceUpdateCallback)
            }
        }
    });
}

$('.selected-product').click(productUpdateCallback)
$('.selected-product').trigger('click')

function generateSizingTable(sizes) {

    let heads = '', inputs = ''

    //====================== This content is when no sizes for product ======================
    if (sizes.length==0){
        heads = `<th class="text-center" scope="col">Free Size</th>`
        inputs = `<td><input type="text" data-size="" data-no_size="1" class="form-control px-0 text-center"></td>`
    }
    //====================== This content is when no sizes for product ======================

    sizes.map(s => {
        heads += `<th class="sizing text-center" scope="col">${s}</th>`
        inputs += `<td><input type="text" data-size="${s}" class="form-control px-0 text-center"></td>`
    })

    return `
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th scope="col">{{_("Sizing")}}</th>
                        ${heads}
                    </tr>
                </thead>
                <tbody>
                    <tr class="qty">
                        <th class="qty" scope="row">{{_("Quantity")}}</th>
                        ${inputs}
                    </tr>
                    <tr class="modified-qty">
                        <th scope="row">{{_("Modified quantity")}}</th>
                        ${inputs}
                    </tr>
                </tbody>
            </table>
    `
}

const cleartable = () => $('.table-section').html('')

const setClose = () => {
    $('.close').click(e => {
        if (tablecount > 1) {
            $(e.target).parent().parent().parent().remove()
            tablecount--
        }
    })
}

setClose()


$('#submit').click(() => {
    if ($('#internal-ref').val() == '') {
        frappe.throw(frappe._("Please enter internal ref"))
    }
    let products = {}
    let garmentlabel = $('#garmentlabel>option:selected').text()
    let allnull = true
    $('.product-table').map(function () {
        let product = $($(this).find('.selected-product')[0]).find('option:selected').val()
        let destination = $($(this).find('.destination')[0]).find('option:selected').text()

        let qtys = {}
        let sizes = []
        let counter = 0

        $(this).find('.sizing').map(function () {
            sizes.push($(this).text())
        })
        let free_size_qty = null
        if (sizes.length==0){
    //====================== This content is when no sizes for product ======================
            if (($('.qty>td>input').val() != "") && (!isNaN($('.qty>td>input').val()))) {
                free_size_qty = $('.qty>td>input').val()                
                allnull = false
            }
    //====================== This content is when no sizes for product ======================
        }else{      
            $(this).find('.qty>td>input').map(function () {
                if (($(this).val() != "") && (!isNaN($(this).val()))) {
                    qtys[sizes[counter++]] = $(this).val()
                    allnull = false
                }
                else{
                    qtys[sizes[counter++]] = 0
                }
                // qtys.push($(this).val())
            })
        }
        products[product] = {
            item: product,
            destination,
            quantities: qtys,
            free_size_qty : free_size_qty
        }
    })
    console.log(products, garmentlabel)
    if (allnull) {
        frappe.throw(frappe._("Please fill quantities"))
    }
    frappe.call({
        method: 'erpnext.modehero.sales_order.create_sales_order',
        args: {
            items: products,
            garmentlabel,
            internalref: $('#internal-ref').val(),
            profoma
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r)
                let order = r.message.order
                if (order && order.name) {
                    $('#order-no').html(order.name)
                    frappe.msgprint({
                        title: __('Notification'),
                        indicator: 'green',
                        message: __('Sales order ' + order.name + ' created successfully')
                    });
                }
            }
        }
    })

})

$('#upload-profoma').click(function () {
    let file = $('#profoma').prop('files')[0]
    if (file.size / 1024 / 1024 > 5) {
        frappe.throw("Please upload file less than 5mb")
        return
    }
    var reader = new FileReader();
    reader.readAsDataURL(file);
    console.log(file, reader, reader.result)
    reader.onload = function () {
        frappe.call({
            method: 'frappe.handler.uploadfile',
            // method: 'erpnext.modehero.sales_order.upload_test',
            args: {
                filename: file.name,
                attached_to_doctype: 'Sales Order',
                attached_to_field: 'profoma',
                is_private: true,
                filedata: reader.result,
                from_form: true,
            },
            callback: function (r) {
                if (!r.exc) {
                    console.log(r)
                    frappe.msgprint("File successfully uploaded")
                    $('#profoma-label').html(r.message.file_url)
                    profoma = r.message.file_url
                }
            }
        })

    }

})

function priceUpdateCallback(e) {
    // console.log(e.target.value, $(e.target).attr('data-size'))
    if (!numeric.test(e.target.value)) {
        $(e.target).css('border-color', 'red')
    } else {

        let products = {}
        let totalqty = 0
        //calculate price 
        $('.product-table').map(function () {
            let product = $(this).find('.selected-product>option:selected').val()

            $(this).find('.qty>td').map(function () {
                let qty = $(this).find('input').val()
                let size = $(this).find('input').attr('data-size')

                if (!products[product]) {
                    products[product] = {}
                }
                if (qty != '') {
                    products[product][size] = qty
                    totalqty += parseInt(qty);
                }
            })

        })
        console.log(products)

        $(e.target).css('border', '1px solid #ced4da')
        calculatePrice(products, totalqty)
    }
}

function calculatePrice(products, totalqty) {
    frappe.call({
        method: 'erpnext.modehero.sales_order.calculate_price',
        args: {
            products
        },
        callback: function (r) {
            if (!r.exc) {
                console.log(r.message)
                $('#total').html(r.message.total)
                let prices = r.message
                for (let p in prices) {
                    var total_price = flt(prices.perpiece[p] * totalqty)
                    $(`#${p}`).find('.total-price').html(total_price)
                    $(`#${p}`).find('.price-pp').html(prices.perpiece[p])
                    $(`#${p}`).find('.total-order').html(totalqty)
                }
            }
        }
    })
}

function calculatePriceOnLoad() {
    let products = {}
    $('.product-table').map(function () {
        let product = $(this).find('.product').attr('data-product')
        $(this).find('.qty>td').map(function () {
            let qty = $(this).html().trim()
            let size = $(this).attr('data-size')

            if (!products[product]) {
                products[product] = {}
            }
            if (qty != '') {
                products[product][size] = qty
            }
        })
    })
    console.log(products)
    calculatePrice(products)
}

{% if order %}
setTimeout(() => {
    calculatePriceOnLoad()
}, 500);
{% endif %}

$('.modified-qty').change(function () {
    calculatePrice(getModifiedProducts())
})

$('#cancel').click(function () {
    var r = confirm(frappe._("Are you sure want to cancel this order?"))
    if (r == true) {
        let order = $('#order-no').html().trim()
        frappe.call({
            method: 'erpnext.modehero.sales_order.cancel',
            args: {
                order
            },
            callback: function (r) {
                if (!r.exc) {
                    console.log(r)
                    window.location.reload()
                }
            }
        })
    }
})

function getModifiedProducts() {
    let products = {}
    $('.product-table').map(function () {
        let product = $(this).find('.product').attr('data-product')
        console.log(product)
        $(this).find('.modified-qty').map(function () {
            let qty = $(this).val()
            let size = $(this).attr('data-size')
            if (!products[product]) {
                products[product] = {}
            }
            if (qty != '') {
                products[product][size] = qty
            }
        })
    })
    console.log(products)
    return products
}

$('#validate').click(function () {
    var r = confirm(frappe._("Are you sure want to validate this order?"))
    if (r == true) {
        let order = $('#order-no').text().trim()
        frappe.call({
            method: 'erpnext.modehero.sales_order.validate_order',
            args: {
                order,
                products: getModifiedProducts()
            },
            callback: function (r) {
                if (!r.exc) {
                    console.log(r)
                    window.location.reload()
                }
            }
        })
    }
})