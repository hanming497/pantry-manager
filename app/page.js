'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField } from '@mui/material'
import { db } from '@/firebase'
import {
    collection,
    doc,
    getDocs,
    query,
    setDoc,
    deleteDoc,
    getDoc,
} from 'firebase/firestore'

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'white',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
}

export default function Home() {
    const [inventory, setInventory] = useState([])
    const [open, setOpen] = useState(false)
    const [itemName, setItemName] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const updateInventory = async () => {
        try {
            const snapshot = query(collection(db, 'inventory'))
            const docs = await getDocs(snapshot)
            const inventoryList = []
            docs.forEach((doc) => {
                inventoryList.push({ name: doc.id, ...doc.data() })
            })
            setInventory(inventoryList)
        } catch (error) {
            console.error("Failed to fetch inventory:", error)
        }
    }

    const addItem = async (item) => {
        setInventory(prevInventory => [...prevInventory, { name: item, quantity: 1 }])
        try {
            const docRef = doc(collection(db, 'inventory'), item)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const { quantity } = docSnap.data()
                await setDoc(docRef, { quantity: quantity + 1 })
            } else {
                await setDoc(docRef, { quantity: 1 })
            }
            updateInventory()
        } catch (error) {
            console.error("Failed to add item to Firestore:", error)
        }
    }

    const removeItem = async (item) => {
        // Immediately update the local state
        setInventory(prevInventory => 
            prevInventory.map(invItem => 
                invItem.name === item
                    ? { ...invItem, quantity: Math.max(0, invItem.quantity - 1) }
                    : invItem
            ).filter(invItem => invItem.quantity > 0)
        )

        // Attempt to update Firestore in the background
        try {
            const docRef = doc(collection(db, 'inventory'), item)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const { quantity } = docSnap.data()
                if (quantity === 1) {
                    await deleteDoc(docRef)
                } else {
                    await setDoc(docRef, { quantity: quantity - 1 })
                }
            }
        } catch (error) {
            console.error("Failed to remove item from Firestore:", error)
            // Optionally, you could update the inventory again here to sync with Firestore
            // updateInventory()
        }
    }

    useEffect(() => {
        updateInventory()
    }, [])

    const handleOpen = () => setOpen(true)
    const handleClose = () => setOpen(false)

    const filteredInventory = inventory.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Box
            width="100vw"
            height="100vh"
            display={'flex'}
            justifyContent={'center'}
            flexDirection={'column'}
            alignItems={'center'}
            gap={2}
            bgcolor={'#f5f5f5'}
        >
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Add Item
                    </Typography>
                    <Stack width="100%" direction={'row'} spacing={2}>
                        <TextField
                            id="outlined-basic"
                            label="Item"
                            variant="outlined"
                            fullWidth
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                        />
                        <Button
                            variant="outlined"
                            onClick={() => {
                                addItem(itemName)
                                setItemName('')
                                handleClose()
                            }}
                        >
                            Add
                        </Button>
                    </Stack>
                </Box>
            </Modal>
            
            <Box width="800px" boxShadow={3} borderRadius={2} overflow="hidden">
                <Box
                    width="100%"
                    height="100px"
                    bgcolor={'#1976d2'}
                    display={'flex'}
                    justifyContent={'center'}
                    alignItems={'center'}
                >
                    <Typography variant={'h4'} color={'white'} textAlign={'center'}>
                        Inventory Items
                    </Typography>
                </Box>
                <Box p={2} bgcolor={'white'}>
                    <Stack direction="row" spacing={2} mb={2}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button variant="contained" onClick={handleOpen}>
                            Add New Item
                        </Button>
                    </Stack>
                    <Stack spacing={2} maxHeight="400px" overflow={'auto'}>
                        {filteredInventory.map(({ name, quantity }) => (
                            <Box
                                key={name}
                                width="100%"
                                display={'flex'}
                                justifyContent={'space-between'}
                                alignItems={'center'}
                                bgcolor={'#f0f0f0'}
                                p={2}
                                borderRadius={1}
                            >
                                <Typography variant={'h6'} color={'#333'}>
                                    {name.charAt(0).toUpperCase() + name.slice(1)}
                                </Typography>
                                <Typography variant={'body1'} color={'#555'}>
                                    Quantity: {quantity}
                                </Typography>
                                <Button variant="outlined" color="error" onClick={() => removeItem(name)}>
                                    Remove
                                </Button>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Box>
        </Box>
    )
}