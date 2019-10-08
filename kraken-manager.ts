import '@webcomponents/custom-elements'
import '@material/mwc-snackbar'
import 'mwc-app-dialog'
import '@material/mwc-icon'
import '@material/mwc-ripple'
import { html, render } from 'lit-html'
import { Snackbar } from '@material/mwc-snackbar'
import { MwcAppDialog } from 'mwc-app-dialog'

/* Selectors */
const AMOUNTS_SELECTOR = '.formatted-currency'
const ORDER_TYPE_SELECTOR = '.ib.btn-group.top'
const ORDER_FORM_SELECTOR = '.form-order-simple'
const VALUE_MONO_SELECTOR = '.val.mono'
const TOP_SIDE_SELECTOR = '#topside'
const TRANSACTION_TITLE_SELECTOR = '.clearfix.vmarg20bot > h4.title'
/* Constants */
const ORDER_TYPE_BUY = 'order_type_buy'
const ORDER_TYPE_SELL = 'order_type_sell'

interface Transaction {
  amount: number
  price: number
  fees: number
}

/**
 * Global variables
 */
let hash: { [key: string]: string } = {}
let amountElement
let quickpairs = localStorage.getItem('quickpairs')
  ? JSON.parse(<string>localStorage.getItem('quickpairs'))
  : ['XBT/EUR', 'ETH/EUR', 'XMR/EUR', 'ATOM/EUR', 'XTZ/EUR', 'XRP/EUR']
let transactionValues: Transaction | null
declare let chrome: any
declare let quickPairAccess: HTMLDivElement
declare let transactionValuesButtons: HTMLDivElement
declare let snackbar: Snackbar
declare let dialog: MwcAppDialog

/**
 * On page change
 */
const pageChange = () => {
  hash = Object.fromEntries(window.location.hash.slice(1).split('&').map(p => p.split('=')))
  if (hash.tab === undefined) {
    hash.tab = ''
  }

  switch (hash.tab) {
    case 'trades':
      if (hash.txid) {
        // we should insert the buttons to copy the informations on the page here
        setTimeout(() => {
          // add the container
          $(`<div id="transactionValuesButtons"></div>`).insertAfter(TRANSACTION_TITLE_SELECTOR)
          render(
            html`
            <style>
              #transactionValuesButtons > button {
                background: black;
                color: white;
                padding: 6px 11px;
                margin: 6px 0 0 9px;
              }
            </style>
            <button @click="${copyTransactionValues}">Copy</button>
            <button @click="${resetTransactionValues}">Clear cache</button>
            `,
            transactionValuesButtons
          )
        }, 500)
      }
      break
    default:
      break
  }
}
/**
 * First time execution
 */
window.onload = () => {
  /* icons */
  $(`
  <style>
    @font-face {
      font-family: 'Material Icons';
      font-style: normal;
      font-weight: 400;
      src: url(${chrome.runtime.getURL('fonts/MaterialIcons-Regular.eot')}); /* For IE6-8 */
      src: local('Material Icons'),
      local('MaterialIcons-Regular'),
      url(${chrome.runtime.getURL('fonts/MaterialIcons-Regular.woff2')}) format('woff2'),
      url(${chrome.runtime.getURL('fonts/MaterialIcons-Regular.woff')}) format('woff'),
      url(${chrome.runtime.getURL('fonts/MaterialIcons-Regular.ttf')}) format('truetype');
    }
  </style>
  `)

  /* Amount elements */
  $(AMOUNTS_SELECTOR).css('cursor', 'pointer')
  // on amount (cryptomoney) element click
  // @ts-ignore
  document.querySelector(AMOUNTS_SELECTOR).addEventListener('click', e => {
    if (hash.tab === 'new-order') {
      const orderType = getOrderType()
      if (orderType) {
        switch (orderType) {
          case ORDER_TYPE_BUY:
          // no difference for now
          case ORDER_TYPE_SELL:
            const form: any = $(ORDER_FORM_SELECTOR)[0]
            if (form) {
              // @ts-ignore
              form.volume.value = parseFloat(e.target.textContent.trim().slice(1))
              // doesn't work ?
              notifyInputElement(form.volume)
            }
            break
        }
      }
    }
  })
  // on amount (euro) element click
  document.querySelectorAll(AMOUNTS_SELECTOR)[1].addEventListener('click', e => {
    if (hash.tab === 'new-order') {
      const orderType = getOrderType()
      if (orderType) {
        switch (orderType) {
          case ORDER_TYPE_BUY:
          // no difference for now
          case ORDER_TYPE_SELL:
            const form: any = $(ORDER_FORM_SELECTOR)[0]
            if (form) {
              // @ts-ignore
              form.total.value = parseFloat(e.target.textContent.trim().slice(1))
              // doesn't work ?
              notifyInputElement(form.total)
            }
            break
        }
      }
    }
  })

  /* Value element */
  $(VALUE_MONO_SELECTOR).css('cursor', 'pointer')
  // on value element click
  $(VALUE_MONO_SELECTOR).on('click', e => {
    if (hash.tab === 'new-order') {
      const orderType = getOrderType()
      if (orderType) {
        switch (orderType) {
          case ORDER_TYPE_BUY:
          // no difference for now
          case ORDER_TYPE_SELL:
            const form = $(ORDER_FORM_SELECTOR)[0]
            if (form) {
              // @ts-ignore
              form.price.value = e.target.textContent.trim().slice(1)
            }
            break
        }
      }
    }
  })

  /* QuickPairAccess */
  // add the container after the topside element
  $('<div id="quickPairAccess"></div>').insertAfter(TOP_SIDE_SELECTOR)
  updateQuickPairAccess()

  /* Snackbar */
  $('<mwc-snackbar id="snackbar"></mwc-snackbar>').appendTo(document.body)

  /* Dialog */
  $('<mwc-app-dialog id="dialog"></mwc-app-dialog>').appendTo(document.body)

  /* on page change event */
  $(window).on('hashchange', () => {
    pageChange()
  })
  pageChange()
}

/**
 * Util
 */
const getOrderType = () => {
  const orderTypeElement = $(ORDER_TYPE_SELECTOR)[0]
  if (orderTypeElement) {
    const activeElement = orderTypeElement.querySelector('.active')
    if (activeElement && activeElement.textContent) {
      return activeElement.textContent.trim() === 'Acheter' ? ORDER_TYPE_BUY : ORDER_TYPE_SELL
    }
  }
  return undefined
}

const openSnackbar = (text: string) => {
  snackbar.labelText = text
  snackbar.open()
}

const updateQuickPairAccess = () => {
  render(
    html`
    <style>
      #quickPairAccess {
        display:flex;
        background: black;
      }
      #quickPairAccess > span, #quickPairAccess > mwc-icon {
        padding: 9px 11px;
        cursor: pointer;
        color: white;
      }
      #quickPairAccess > span:first-of-type {
        padding-left: 20px;
      }
      #quickPairAccess mwc-ripple { 
        --mdc-theme-primary: white;
      }
    </style>
    ${quickpairs.length === 0 ? html`<span>no pairs</span>` : null}
    ${quickpairs.map(
      (pair: string) => html`
    <span @click="${() => navigateToPair(pair)}">${pair}<mwc-ripple primary></mwc-ripple></span>`
    )}
    <mwc-icon @click="${openAddQuickPairDialog}">add</mwc-icon>
    <mwc-icon @click="${openDeleteQuickPairDialog}">delete</mwc-icon>
    `,
    quickPairAccess
  )
}

const navigateToPair = (pair: string) => {
  const pairElement = $(`a[data-pair-text="${pair}"]`)
  if (pairElement.length === 0) {
    openSnackbar("the pair doesn't exist")
    return
  }
  pairElement[0].click()
}

const copyTransactionValues = () => {
  const getTrFromText = (name: string) => {
    return [...$(`td:contains('${name}')`)].filter(el => {
      return getComputedStyle(el).getPropertyValue('visibility') === 'visible' && el.innerText === name
    })[0].parentElement
  }
  const getValueOf = (text: string) => {
    // @ts-ignore
    return getTrFromText(text).querySelector('[class=mono]').textContent.trim()
  }
  const amount = parseFloat(getValueOf('Volume'))
  const price = parseFloat(getValueOf('Prix').replace(/,/g, '').slice(1))
  const fees = parseFloat(getValueOf('Frais').slice(1))

  if (!transactionValues) {
    transactionValues = { amount, price, fees }
  } else {
    transactionValues.amount += amount
    transactionValues.price = price
    transactionValues.fees += fees
  }
  copyToClipboard(Object.values(transactionValues).join('\n'))
  openSnackbar('values copied')
}

const resetTransactionValues = () => {
  transactionValues = null
  openSnackbar('values cleaned')
}

const copyToClipboard = (str: string) => {
  let el = document.createElement('textarea')
  el.value = str
  // @ts-ignore
  el.style = 'position:absolute;left:-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

/**
 * Dialogs
 */
const openAddQuickPairDialog = async () => {
  try {
    await dialog.open(
      'type a pair in',
      html`
      <input type="text" placeholder="example: XBT/EUR" id="pair" style="padding:5px 6px;box-sizing:border-box;width:100%;">
      `,
      (dom: HTMLElement) => {
        // @ts-ignore
        const pair = dom.pair.value

        if (!verifyPairExist(pair)) {
          openSnackbar(`the pair "${pair}" doesn't exist`)
          return
        }
        quickpairs.push(pair)
        localStorage.setItem('quickpairs', JSON.stringify(quickpairs))
        updateQuickPairAccess()
      }
    )
  } catch (e) {
    return
  }
}

const openDeleteQuickPairDialog = async () => {
  try {
    await dialog.open(
      'type a pair in',
      html`
      <input type="text" placeholder="example: XBT/EUR" id="pair" style="padding:5px 6px;box-sizing:border-box;width:100%;">
    `,
      (dom: HTMLElement) => {
        // @ts-ignore
        const pair = dom.pair.value
        if (!quickpairs.includes(pair)) {
          openSnackbar(`the pair "${pair} is not listed`)
          return
        }
        quickpairs.splice(quickpairs.indexOf(pair), 1)
        localStorage.setItem('quickpairs', JSON.stringify(quickpairs))
        updateQuickPairAccess()
      }
    )
  } catch (e) {
    return
  }
}

const verifyPairExist = (pair: string) => {
  const pairElement = $(`a[data-pair-text="${pair}"]`)
  return pairElement.length === 1
}

const notifyInputElement = (input: HTMLInputElement) => {
  const changevent = document.createEvent('Events')
  changevent.initEvent('change', true, true)
  input.dispatchEvent(changevent)
  input.click()
}
