var tablecount = 1;

$('#addtable').click(() => {
    $('#box1').clone().appendTo('#container')
    tablecount++
    $('.selected-product').change(productUpdateCallback)
    setClose()
})

$('.close').click(e => console.log($(e.target).parent()))

const productUpdateCallback = (e) => {
    // console.log($(e.target).parent().parent().parent().parent().find('.table-section')[0])
    product = $(e.target).find("option:selected").text()
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
            }
        }
    });
}

$('.selected-product').change(productUpdateCallback)

function generateSizingTable(sizes) {

    let heads = '', inputs = ''

    sizes.map(s => {
        heads += `<th scope="col">${s}</th>`
        inputs += `<td><input type="text" class="form-control"></td>`
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
                        <th scope="row">{{_("Quantity")}}</th>
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


$('#validate').click(() => {
    let products = $('.table-section')
    console.log(products)

    
    // frappe.call({
    //     method: 'erpnext.modehero.sales_order.create_sales_order',
    //     args: {
    //         args: {}
    //     },
    //     callback: function (r) {
    //         if (!r.exc) {
    //             console.log(r)
    //             frappe.msgprint({
    //                 title: __('Notification'),
    //                 indicator: 'green',
    //                 message: __('Sales order created successfully')
    //             });
    //         }
    //     }
    // })

})