import * as React from 'react'
import * as web3Utils from 'web3-utils'
import * as Web3Contract from 'web3-eth-contract'
import * as web3Abi from 'web3-eth-abi'
import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import CardContent from '@material-ui/core/CardContent'
import Tabs from '@material-ui/core/Tabs'
import Tab from '@material-ui/core/Tab'
import Button from '@material-ui/core/Button'
import Divider from '@material-ui/core/Divider'
import LinearProgress from '@material-ui/core/LinearProgress'

import ERCPanel from '../../components/ERCPanel'
import TransactionList from '../../components/TransactionList'
import TransactionTable from '../../containers/TransactionTable'
import Dialog from '../Dialog'

import { withObservables } from '../../contexts/observables'
import { IContainerProps, Transaction, ABI } from '../../typings'
import LocalAccounts, { LocalAccount } from '../../components/LocalAccounts'
import ErrorNotification from '../../components/ErrorNotification'

const layouts = require('../../styles/layout.scss')
const texts = require('../../styles/text.scss')
const styles = require('./styles.scss')

enum AccountType {
  NORMAL = '普通账户',
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
}

// const initABI = JSON.parse(
//   '[{"constant":false,"inputs":[{"name":"_value","type":"uint256"},{"name":"_value2","type":"uint256"},{"name":"_value3","type":"uint256"},{"name":"_value4","type":"uint256"}],"name":"set","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"get","outputs":[{"name":"haha","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]',
// )

interface Contract {
  methods?: any
  _jsonInterface: {
    signature: string
  }[]
}

const accountFormatter = (addr: string) =>
  addr.startsWith('0x') ? addr : `0x${addr}`
interface AccountProps extends IContainerProps {}
const initState = {
  loading: 0,
  type: AccountType.NORMAL,
  addr: '',
  abi: [] as ABI,
  // abi: initABI,
  contract: { _jsonInterface: [] } as Contract,
  balance: '',
  txCount: '',
  creator: '',
  transactions: [] as Transaction[],
  customToken: {
    name: '',
  },

  normals: [] as LocalAccount[],
  erc20s: [] as LocalAccount[],
  erc721s: [] as LocalAccount[],
  panelOn: false,
  addrsOn: false,
  normalsAdd: {
    name: '',
    addr: '',
  },
  erc20sAdd: {
    name: '',
    addr: '',
  },
  erc721sAdd: {
    name: '',
    addr: '',
  },
  error: {
    code: '',
    message: '',
  },
}

type AccountState = typeof initState
class Account extends React.Component<AccountProps, AccountState> {
  state = initState

  componentWillMount () {
    const { account } = this.props.match.params
    this.onMount(account)
  }
  componentWillReceiveProps (nextProps: AccountProps) {
    const { account } = nextProps.match.params
    if (account && account !== this.props.match.params.account) {
      window.location.reload()
      // this.onMount(account)
      // this.forceUpdate(
    }
  }
  componentDidCatch (err) {
    this.handleError(err)
  }
  private onMount = account => {
    this.setState(initState)
    this.loadAddrList()
    this.updateBasicInfo(account)
  }
  private onTabClick = (e, value) => {
    this.setState(state => ({ panelOn: !!value }))
  }

  protected readonly addrGroups = [
    {
      key: 'normals',
      label: AccountType.NORMAL,
    },
    {
      key: 'erc20s',
      label: AccountType.ERC20,
    },
    {
      key: 'erc721s',
      label: AccountType.ERC721,
    },
  ]
  private generalInfo = [
    { key: 'balance', label: 'Balance' },
    { key: 'txCount', label: 'Count of Transactions' },
  ]
  private fetchInfo = addr => {
    /**
     * @method get_balance
     */
    this.setState(state => ({ loading: state.loading + 1 }))
    this.props.CITAObservables.getBalance({ addr, blockNumber: 'latest' })
      .finally(() => this.setState(state => ({ loading: state.loading - 1 })))
      .subscribe(
        (balance: string) =>
          this.setState(state => ({ balance: `${+balance}` })),
        error => this.handleError(error),
        () => {},
      )
    /**
     * @method get_transaction_count
     */
    this.setState(state => ({ loading: state.loading + 1 }))
    this.props.CITAObservables.getTransactionCount({
      accountAddr: addr,
      blockNumber: 'latest',
    })
      .finally(() => this.setState(state => ({ loading: state.loading - 1 })))
      .subscribe(
        // next
        (count: string) =>
          this.setState(state => ({ txCount: count.slice(2) })),
        // error
        error => this.handleError(error),
        // complete
        () => {},
      )

    /**
     * @method get_abi
     */
    this.setState(state => ({ loading: state.loading + 1 }))
    this.props.CITAObservables.getAbi({
      contractAddr: addr,
      blockNumber: 'latest',
    })
      .finally(() => this.setState(state => ({ loading: state.loading - 1 })))
      .subscribe(
        // next
        encoded => {
          if (encoded === '0x') return
          try {
            const abiStr = web3Utils.hexToUtf8(encoded as string)
            const abi = JSON.parse(abiStr)
            const contract = new Web3Contract(abi, this.state.addr)
            this.setState(state => ({
              abi,
              contract,
            }))
          } catch (err) {
            // console.error(e.stack)
            this.handleError(err)
          }
        },
        // error
        err => {
          this.handleError(err)
        },
        // complete
        () => {
          // this.setState(state => ({ loading: state.loading - 1 }))
        },
      )
  }
  private updateBasicInfo = account => {
    if (account) {
      const addr = accountFormatter(account)
      let type = AccountType.NORMAL
      type = this.state.erc20s.map(erc => erc.addr).includes(addr)
        ? AccountType.ERC20
        : type
      type = this.state.erc721s.map(erc => erc.addr).includes(addr)
        ? AccountType.ERC721
        : type
      this.setState({
        addr,
        type,
      })
      this.fetchInfo(addr)
    }
  }
  private loadAddrList = () => {
    const normals = JSON.parse(window.localStorage.getItem('normals') || '[]')
    const erc20s = JSON.parse(window.localStorage.getItem('erc20s') || '[]')
    const erc721s = JSON.parse(window.localStorage.getItem('erc721s') || '[]')
    this.setState(state => ({
      normals,
      erc20s,
      erc721s,
    }))
  }
  private toggleAddrs = (addrsOn = false) => e => {
    this.setState(state => ({ addrsOn }))
  }
  private addAddr = group => e => {
    this.setState(state => {
      const { name, addr } = this.state[`${group}Add`]
      const newList = [...state[group], { name, addr }]
      window.localStorage.setItem(group, JSON.stringify(newList))
      return {
        ...state,
        [group]: newList,
        [`${group}Add`]: {
          name: '',
          addr: '',
        },
      }
    })
  }
  private handleAddrInput = (group, label) => e => {
    const { value } = e.target
    this.setState(state => ({
      ...state,
      [`${group}Add`]: {
        ...state[`${group}Add`],
        [label]: value,
      },
    }))
  }
  private handleAddrDelete = (group, index) => e => {
    this.setState(state => {
      const { name, addr } = this.state[`${group}Add`]
      const newList = [...state[group]]
      newList.splice(index, 1)
      window.localStorage.setItem(group, JSON.stringify(newList))
      return {
        ...state,
        [group]: newList,
        [`${group}Add`]: {
          name: '',
          addr: '',
        },
      }
    })
  }
  private handleAbiValueChange = (index: number) => (
    inputIndex: number,
  ) => e => {
    const { value } = e.target
    this.setState(state => {
      const abi = [...state.abi]
      const oldInput = abi[index].inputs[inputIndex]
      const newInput = { ...oldInput, value }
      abi[index].inputs[inputIndex] = newInput
      return { ...state, abi }
    })
  }
  private handleEthCall = (index: number) => e => {
    const inputs = this.state.abi[index].inputs.map(input => ({
      name: input.name,
      value: input.value,
    }))
    /* eslint-disable no-underscore-dangle */
    const jsonInterface = this.state.contract._jsonInterface[index]
    /* eslint-enable no-underscore-dangle */
    // send transform data
    const data = web3Abi.encodeFunctionCall(
      jsonInterface,
      inputs.map(input => input.value),
    )
    this.setState(state => ({ loading: state.loading + 1 }))
    /**
     * @method eth_call
     */
    this.props.CITAObservables.ethCall({
      from: '',
      to: this.state.addr,
      data,
      blockNumber: 'latest',
    })
      .finally(() => this.setState(state => ({ loading: state.loading - 1 })))
      .subscribe(
        // next
        result => {
          try {
            const outputs = web3Utils.hexToUtf8(result)
            this.setState(state => {
              const abi = [...state.abi]
              if (typeof outputs === 'string') {
                abi[index].outputs[0].value = outputs
              } else {
                outputs.forEach((output, outputIndex) => {
                  abi[index].outputs[outputIndex].value = output
                })
              }
              return { ...state, abi }
            })
          } catch (err) {
            this.handleError(err)
          }
        },
        // error
        error => this.handleError(error),
        // complete
        () => {},
      )
  }
  private handleError = error => {
    this.setState(state => ({
      error,
    }))
  }
  private dismissNotification = e => {
    this.setState(state => ({ error: { message: '', code: '' } }))
  }
  render () {
    const {
      loading,
      addr,
      balance,
      txCount,
      type,
      panelOn,
      transactions,
      addrsOn,
      normals,
      erc20s,
      erc721s,
      normalsAdd,
      erc20sAdd,
      erc721sAdd,
      abi,
      error,
    } = this.state
    return (
      <React.Fragment>
        {loading ? <LinearProgress /> : null}
        <div className={layouts.main}>
          <Card classes={{ root: layouts.cardContainer }}>
            <CardHeader
              // avatar={<Avatar aria-label="Recipe">{addr.slice(2, 3)}</Avatar>}
              avatar={
                <img
                  src="https://cdn.dribbble.com/users/1358412/screenshots/3234234/fantastic_planet_004.jpg"
                  alt="tx"
                  className={styles.acountIcon}
                />
              }
              title={
                <div className={styles.accountHeader}>
                  <div>
                    Account: <span className={texts.addr}>{addr}</span>
                  </div>
                  <div>
                    Balance: <span>{balance}</span>
                  </div>
                </div>
              }
              // subheader={type}
              action={
                <Button onClick={this.toggleAddrs(true)}>管理本地账户</Button>
              }
            />
            <CardContent>
              <Tabs value={+panelOn} onChange={this.onTabClick}>
                <Tab label={`Transactions(${txCount})`} />
                {abi && abi.length ? <Tab label="Contract Panel" /> : null}
              </Tabs>
              <Divider />
              {panelOn ? (
                <ERCPanel
                  abi={abi.filter(abiEl => abiEl.type === 'function')}
                  handleAbiValueChange={this.handleAbiValueChange}
                  handleEthCall={this.handleEthCall}
                />
              ) : (
                <TransactionTable {...this.props} />
              )}
            </CardContent>
          </Card>
        </div>
        <Dialog
          fullScreen
          on={addrsOn}
          dialogTitle="地址管理"
          onClose={this.toggleAddrs()}
        >
          <LocalAccounts
            addrGroups={this.addrGroups}
            normals={normals}
            erc20s={erc20s}
            erc721s={erc721s}
            normalsAdd={normalsAdd}
            erc20sAdd={erc20sAdd}
            erc721sAdd={erc721sAdd}
            handleAddrInput={this.handleAddrInput}
            handleAddrDelete={this.handleAddrDelete}
            addAddr={this.addAddr}
          />
        </Dialog>
        <ErrorNotification
          error={error}
          dismissNotification={this.dismissNotification}
        />
      </React.Fragment>
    )
  }
}

export default withObservables(Account)
