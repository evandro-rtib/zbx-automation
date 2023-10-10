//@P1-1nt3gr@c@0
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const companies = [];
const company1 = {
  company_id: 1,
  name: 'Grupo Virtual Ports',
  url: 'http://gvpbase.dyndns.org:9090/zabbix/api_jsonrpc.php',
  token: 'f55b391d04012f5bb99b27aade991f19a4a874a15c49522eac818289646e52c9',
  peer_unregistry_hostgroup_name: 'RAMAIS SEM REGISTRO'
};
companies.push(company1);

// Rota para receber o webhook
app.post('/events', (req, res) => {
  const { company_id, host, events_tags} = req.body;

  // EVENT PEER_UNREGISTRY
  console.log(events_tags)
  // Chamada à API do Zabbix

  let obj = companies.find(company => company.company_id === company_id);
  let peer_unregistry_hostgroup_name=obj.peer_unregistry_hostgroup_name
  let host_id
  let peer_unregistry_hostgroup_id
  let hostgroups
  let msg
  const url = obj.url;
  

  //RECUPERAR DADOS DO HOSTGROUP PEER UNREGISTRY
  const peer_unregistry_hostgroup={
    "jsonrpc": "2.0",
    "method": "hostgroup.get",
    "params": {
        "output": "extend",
        "filter": {
            "name": [ peer_unregistry_hostgroup_name ]
        }
    },
    id: 1,
    auth: obj.token
  }
  axios.post(url, peer_unregistry_hostgroup, {
    headers: {
      'Content-Type': 'application/json-rpc'
    }
  })
  .then(response => {
    const response_hostgroup = response.data;
    peer_unregistry_hg = response_hostgroup.result.map(hg => {
      peer_unregistry_hostgroup_id = hg.groupid
    })

    //RECUPERAR DADOS DO HOST
    const host_get = {
      jsonrpc: '2.0',
      method: 'host.get',
      "params": {
          "output": ["host"],
          "selectHostGroups": "extend",
          "filter": {
              "host": [
                  host
              ]
          },
      },
      id: 1,
      auth: obj.token
    }
    axios.post(url, host_get, {
      headers: {
        'Content-Type': 'application/json-rpc'
      }
    })
    .then(response => {
      const response_host_get = response.data;
      hostgroups = response_host_get.result.map(h => {
          host_id = h.hostid
          host_name = h.host
          const hg_groupid = h.hostgroups.map(hostgroup => ({
              groupid: hostgroup.groupid
          }));
          return hg_groupid;
      }).flat();
      
      msg = {response_host_get,
              hostid: host_id,
              message: 'Dados recebidos e processados com sucesso!'
      }

       //RECUPERAR DADOS DO HOSTGROUP PEER UNREGISTRY
      const hostgroup_set={
        "jsonrpc": "2.0",
        "method": "hostgroup.massupdate",
        "params": {
            "groups": [
                {
                    "groupid": peer_unregistry_hostgroup_id
                }
            ],
            "hosts": [
                {
                    "hostid": host_id
                }
            ]
        },
        id: 1,
        auth: obj.token
      }
      axios.post(url, hostgroup_set, {
        headers: {
          'Content-Type': 'application/json-rpc'
        }
      })
      .then(response => {
        const response_hostgroup_set = response.data;
        msg = {...msg,
                response_hostgroup_set        
        }
        res.json(msg)
      })
      .catch(error => {
          console.error(`Erro ao inserir grupo: ${error}`);
          res.status(500).json({ error: 'Ocorreu um erro ao processar a requisição.' });
      });


      // //ATUALIZAÇÕES DO HOST SE NECESSARIO
      // hostgroups.push({ 'groupid': peer_unregistry_hostgroup_id } )
      // const host_set = {
      //     jsonrpc: '2.0',
      //     method: 'host.update',
      //     "params": {
      //         "hostid": host_id,
      //         "host": "Teste"
      //     },
      //     id: 1,
      //     auth: obj.token
      //   }
      
      
      // axios.post(url, host_set, {
      //     headers: {
      //       'Content-Type': 'application/json-rpc'
      //     }
      //   })
      // .then(response => {
      //     const response_host_set = response.data;
      //     msg = {...msg,response_host_set}
      //     res.json(msg)
      // })
      // .catch(error => {
      //     console.error(`Erro ao inserir grupo: ${error}`);
      //     res.status(500).json({ error: 'Ocorreu um erro ao processar a requisição.' });
      // });

    })
    .catch(error => {
      console.error(`Erro ao carregar dados do host: ${error}`);
      res.status(500).json({ error: 'Ocorreu um erro ao processar a requisição.' });
    });
  })
  .catch(error => {
    console.error(`Erro ao buscar grupo: ${error}`);
    res.status(500).json({ error: 'Ocorreu um erro ao processar a requisição.' });
  });
  
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});